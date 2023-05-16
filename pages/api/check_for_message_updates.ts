import { VercelRequest, VercelResponse } from '@vercel/node'

import prisma, { conciseDateTime, postBlockMessage, updateForecastQuestionMessages } from '../../lib/_utils'
import { buildResolveQuestionBlocks } from '../../lib/blocks-designs/resolve_question'
import { sendEmail } from '../../lib/web/email'
import { getQuestionUrl } from '../q/[id]'

async function getQuestionsToBeResolved()  {
  // check if any questions need to be resolved by time
  const allQuestionsToBeNotified = await prisma.question.findMany({
    where: {
      resolveBy: {
        lte: new Date()
      },
      resolved: false,
      pingedForResolution: false,
    },
    include: {
      profile: {
        include: {
          groups: true
        }
      },
      user: {
        include: {
          profiles: {
            include: {
              groups: true
            }
          },
          accounts: true,
        },
      },
      groups: {
        where: {
          slackTeamId:{
            not: null
          }
        }
      },
      questionMessages: {
        include: {
          message: true
        }
      }
    }
  })
  return allQuestionsToBeNotified
}


async function notifyAuthorsToResolveQuestions() {
  const allQuestionsToBeNotified = await getQuestionsToBeResolved()

  for (const question of allQuestionsToBeNotified) {
    if (question.questionMessages.length > 0) {
      await sendSlackNotification(question)
    } else if (question.user.accounts.length > 0) {
      // only email notify Fatebook web users, and only about questions they haven't shared to Slack
      await sendEmailNotification(question)
    }
  }
  return allQuestionsToBeNotified
}

export async function sendEmailNotification(question: Awaited<ReturnType<typeof getQuestionsToBeResolved>>[number]) {
  await sendEmail({
    subject: `Ready to resolve: ${question.title}`,
    to: question.user.email,
    textBody: `Are you ready to resolve your question: ${question.title}`,
    htmlBody: `<p>Are you ready to resolve your question: <b>${question.title}</b></p>\n
<p><a href=${getQuestionUrl(question)}>Resolve your question</a>.</p>`,
  })
}

async function sendSlackNotification(question: Awaited<ReturnType<typeof getQuestionsToBeResolved>>[number]) {
  // there should only be one slack group per profile
  const group = question.profile.groups.find(g => g.slackTeamId)
  const slackId = question.profile.slackId!
  const teamId = group?.slackTeamId!
  try {
    const resolveQuestionBlock = await buildResolveQuestionBlocks(teamId, question)
    const data = await postBlockMessage(teamId,
                                        slackId,
                                        resolveQuestionBlock,
                                        "Ready to resolve your question?",
                                        { unfurl_links: false, unfurl_media: false })

    if (!data?.ts || !data?.channel) {
      console.error(`Missing message.ts or channel in response ${JSON.stringify(data)}`)
      throw new Error("Missing message.ts or channel in response")
    }

    console.log(`Sent message to ${question.profile.slackId} for question ${question.id}`)

    // OPTIMISATION:: move these intro a transaction
    await prisma.question.update({
      where: {
        id: question.id,
      },
      data: {
        pingedForResolution: true,
        pingResolveMessages: {
          create: {
            message: {
              create: {
                ts: data.ts,
                teamId: teamId,
                channel: data.channel,
              }
            }
          }
        }
      },
    })

    console.log(`Updated question ${question.id} to pingedForResolution`)
  } catch (err) {
    console.error(`Error sending message on question ${question.id}: \n${err}`)
  }
}

async function updateQuestionsToUnhideForecasts(){
  const now = new Date()
  const LAST_X_DAYS = 7
  console.log(`Checking for questions to unhide forecasts for between ${conciseDateTime(now)} ${conciseDateTime(new Date(now.getTime() - LAST_X_DAYS * 24 * 60 * 60 * 1000))}`)
  const questionsToCheck= await prisma.question.findMany({
    where: {
      hideForecastsUntil: {
        lte: now,
        gte: new Date(now.getTime() - LAST_X_DAYS * 24 * 60 * 60 * 1000)
      }
    },
    include: {
      groups: true,
      forecasts: {
        include: {
          user: {
            include: {
              profiles: {
                include: {
                  groups: true
                }
              }
            }
          }
        }
      },
      user: {
        include: {
          profiles: {
            include: {
              groups: true
            }
          }
        }
      },
      questionMessages: {
        include: {
          message: true
        }
      },
      resolutionMessages: {
        include: {
          message: true
        }
      },
      pingResolveMessages: {
        include: {
          message: true
        }
      },
      questionScores: true,
    }
  })

  // if the date of any message last updated is before the hideForecastsUntil date
  //   then needs to be updated
  const questionsToBeUpdated = questionsToCheck.filter((question) =>
    question.questionMessages.filter((qm) =>
      qm.updatedAt < question.hideForecastsUntil!
    ).length > 0
  )

  for (const question of questionsToBeUpdated) {
    await updateForecastQuestionMessages(question, "Forecasts unhidden")
    await prisma.questionSlackMessage.updateMany({
      // select all ids of question messages that are in the question
      where: {
        id: {
          in: question.questionMessages.map((qm) => qm.id)
        }
      },
      data: {
        updatedAt: new Date()
      }
    })
  }

  return questionsToBeUpdated
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log("Not in production, no operation. Make a debug function that restricts these functions to a specific workspace.")
    return
  }

  const allQuestionsToBeNotified = await notifyAuthorsToResolveQuestions()
  const questionsToBeUpdated     = await updateQuestionsToUnhideForecasts()
  res.json({questionsToBeUpdated, allQuestionsToBeNotified})
}
