import { VercelResponse } from '@vercel/node'

import {  buildGetForecastsBlocks } from '../blocks-designs/get_forecasts.js'
import { createProfile, getGroupIDFromSlackID, postSlackMessage } from '../_utils.js'
import prisma from '../_utils.js'

export async function getForecasts(res : VercelResponse, slackUserId : string, slackTeamId : string, channelId : string) {
  console.log('getForecasts called')


  // query the database for the user
  //   we use findFirst because we expect only one result
  //   cannot get unique because we don't have a unique on
  //   uncertain field
  let profile = await prisma.profile.findFirst({
    where: {
      slackId: slackUserId
    },
  })
  console.log("profile tes:", profile)

  // if no profile, create one
  if(!profile) {
    try {
      const createGroupIfNotExists : boolean = true
      const groupId = await getGroupIDFromSlackID(slackTeamId, createGroupIfNotExists)
      profile = await createProfile(slackUserId, groupId)
    } catch(err){
      console.log(`Error: couldn't create userID or group for slackUserID: ${slackUserId}`)
      res.send({
        response_type: 'ephemeral',
        text: `I couldn't find your userID or group!`,
      })
      return
    }
  }

  const allUserForecasts = await prisma.forecast.findMany({
    where: {
      authorId: profile!.id
    },
    include: {
      question: {
        include: {
          forecasts: true,
          slackMessages: true
        }
      }
    },
  })
  console.log("allUserForecasts:", allUserForecasts)

  try {
    const forecastsBlocks = await buildGetForecastsBlocks(allUserForecasts)
    console.log('builtBlocks:', forecastsBlocks)
    await postSlackMessage({
      channel: channelId,
      text: `Forecasts requested for profile ID: ${profile!.id}`,
      blocks: forecastsBlocks,
      unfurl_links: false,
    })
    res.status(200).send({'ok':true})

  } catch (err) {
    console.log('res send Error:', err)
    res.send({
      response_type: 'ephemeral',
      text: `${err}`,
    })
  }
}
