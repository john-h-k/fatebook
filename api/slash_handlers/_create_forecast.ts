import { Profile } from '@prisma/client'
import { VercelResponse } from '@vercel/node'

import { buildQuestionBlocks } from '../blocks-designs/question.js'
import prisma, { getGroupIDFromSlackID, getOrCreateProfile, postMessage } from '../_utils.js'

export async function createForecast(res : VercelResponse, commandArray : string[], slackUserId : string, slackTeamId : string, channelId : string) {
  let question : string = commandArray[2]
  let dateStr  : string = commandArray[3]
  let forecast : string = commandArray[4]
  console.log(`question: ${question}, date: ${dateStr}, forecast: ${forecast}`)

  // find the group id, create group if doesn't exist for workspace
  let groupId : number
  try {
    const createGroupIfNotExists : boolean = true
    groupId = await getGroupIDFromSlackID(slackTeamId, createGroupIfNotExists)
  } catch (err) {
    console.error(`Couldn't find slack group`)
    res.send({
      response_type: 'ephemeral',
      text: `I couldn't find your group! So I don't know where to assign your forecasts.`,
    })
    return
  }

  let profile : Profile
  try {
    profile = await getOrCreateProfile(slackUserId, groupId)
  } catch (err) {
    res.send({
      response_type: 'ephemeral',
      text: `I couldn't find or create your profile!`,
    })
    return
  }

  let forecastNum : number = Number(forecast)

  //parse the date string
  let date : Date = new Date(dateStr)
  await createForecastingQuestion({ question, date, forecastNum, profile, groupId, channelId })
}

export async function createForecastingQuestion({ question, date, forecastNum, profile, groupId, channelId }:{ question: string, date: Date, forecastNum?: number, profile: Profile, groupId: number, channelId: string}) {
  const createdQuestion = await prisma.question.create({
    data: {
      title     : question,
      resolveBy : date,
      authorId  : profile.id,
      groups    : {
        connect: {
          id: groupId
        }
      },
      forecasts : forecastNum ? {
        create: {
          authorId : profile.id,
          forecast : forecastNum
        }
      } : {}
    },
    include: {
      forecasts: {
        include: {
          profile: {
            include: {
              user: true
            }
          }
        }
      },
      profile: {
        include: {
          user: true
        }
      }
    }
  })

  const questionBlocks = buildQuestionBlocks(createdQuestion)

  const data = await postMessage({
    channel: channelId,
    text: `Forecasting question created: ${question}`,
    blocks: questionBlocks,
  })

  if (!data?.ts) {
    console.error(`Missing message.ts in response ${JSON.stringify(data)}`)
    throw new Error("Missing message.ts in response")
  }

  await prisma.question.update({
    where: {
      id: createdQuestion.id
    },
    data: {
      slackMessages: {
        create: {
          ts: data.ts,
          channel: channelId,
        }
      }
    }
  })
  console.log("Recorded question message ts ", data?.ts)
}
