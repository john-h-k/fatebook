import { Question } from '@prisma/client'
import { ActionsBlock, InputBlock } from '@slack/types'
import { QuestionWithForecastsAndUsersAndAuthor } from '../../prisma/additional'
import { conciseDateTime } from '../_utils.js'
import { Blocks, markdownBlock, textBlock, toActionId } from './_block_utils.js'

export function buildQuestionBlocks(question: QuestionWithForecastsAndUsersAndAuthor): Blocks {

  return [
    {
      'type': 'header',
      'text': textBlock(question.title)
    },
    ...question.forecasts.map((forecast) => (
      {
        'type': 'context',
        'elements': [
          {
            'type': 'image',
            'image_url': forecast.profile.user.imageUrl || 'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
            'alt_text': 'profile picture'
          },
          // todo update this for non-slack profiles or profiles from other workspaces (can't mention them)
          markdownBlock(`*${`<@${forecast.profile.slackId}>` || 'Unknown user'}* ${forecast.forecast.toNumber() * 100}% - _submitted ${conciseDateTime(forecast.createdAt)}_`)
        ]
      }
    )),
    ...(question.forecasts.length === 0 ? [{
      'type': 'context',
      'elements': [
        markdownBlock(`_No forecasts yet_`)
      ]
    }] : []),
    buildPredictOptions(question),
    {
      'type': 'context',
      'elements': [
        markdownBlock(`_Created by <@${question.profile.slackId}> using /forecast_`)
      ]
    }
  ]
}

function buildPredictOptions(question: Question): InputBlock | ActionsBlock {

  const useFreeTextInput = true

  const quickPredictOptions = [10, 30, 50, 70, 90]

  if (useFreeTextInput) {
    return {
      'dispatch_action': true,
      'type': 'input',
      'element': {
        'type': 'plain_text_input',
        'placeholder': textBlock('e.g. \'70%\''),
        'action_id': toActionId({
          action: 'submitTextForecast',
          questionId: question.id,
        })
      },
      'label': textBlock('Make a prediction'),
    }
  } else {
    return {
      'type': 'actions',
      'elements': [
        ...quickPredictOptions.map((option) => ({
          'type': 'button',
          'text': textBlock(`${option}%`),
          'style': 'primary',
          'value': 'click_me_123'
        })),
        {
          'type': 'button',
          'text': textBlock('....'),
          'value': 'click_me_123'
        }
      ]
    }
  }

}