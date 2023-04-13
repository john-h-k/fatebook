import { Question } from '@prisma/client'
import { ActionsBlock, InputBlock, SectionBlock } from '@slack/types'
import { QuestionWithForecastsAndUsersAndAuthor } from '../../prisma/additional'
import { conciseDateTime, getDateYYYYMMDD, getResolutionEmoji, round } from '../../lib/_utils.js'
import { Blocks, markdownBlock, ResolveQuestionActionParts, textBlock, toActionId } from './_block_utils.js'

export function buildQuestionBlocks(question: QuestionWithForecastsAndUsersAndAuthor): Blocks {

  return [
    {
      'type': 'header',
      'text': textBlock(question.title)
    },
    ...(question.resolution ? [{
      'type': 'section',
      // NB: this assumes that the author resolved the question
      'text': markdownBlock(`${getResolutionEmoji(question.resolution)} Resolved *${question.resolution}* by <@${question.profile.slackId}>`
        + (question.resolvedAt ? ` on ${getDateYYYYMMDD(question.resolvedAt)}` : '')),
    } as SectionBlock] : [{
      'type': 'section',
      'text': markdownBlock(`Resolves on ${getDateYYYYMMDD(question.resolveBy)}`)
    } as SectionBlock]),
    ...(question.notes ? [{
      'type': 'section',
      'text': textBlock(`${question.notes}`)
    } as SectionBlock] : []),
    ...question.forecasts.map((forecast) => (
      {
        'type': 'context',
        'elements': [
          {
            'type': 'image',
            'image_url': forecast.profile.user.imageUrl || 'https://camo.githubusercontent.com/eb6a385e0a1f0f787d72c0b0e0275bc4516a261b96a749f1cd1aa4cb8736daba/68747470733a2f2f612e736c61636b2d656467652e636f6d2f64663130642f696d672f617661746172732f6176615f303032322d3531322e706e67',
            'alt_text': 'profile picture'
          },
          // todo update this for non-slack profiles or profiles from other workspaces (can't mention them)
          markdownBlock(
            `*${`<@${forecast.profile.slackId}>` || 'Unknown user'}* ` +
            `${(round(forecast.forecast.toNumber() * 100))}%` +
            ` - _submitted at ${conciseDateTime(forecast.createdAt)}_`
          )
        ]
      }
    )),
    ...(question.forecasts.length === 0 ? [{
      'type': 'context',
      'elements': [
        markdownBlock(`_No forecasts yet_`)
      ]
    }] : []),
    ...(!question.resolution ? [buildPredictOptions(question)] : []),
    {
      'type': 'context',
      'elements': [
        markdownBlock(`_Created by <@${question.profile.slackId}> using /forecast_`)
      ]
    },
    {
      'type': 'actions',
      elements: [
        (!question.resolution ?
          {
            'type': 'static_select',
            'placeholder': textBlock('Resolve question'),
            'action_id': toActionId({
              action: 'resolve',
              questionId: question.id,
            }),
            'options': (['yes', 'no', 'ambiguous'] as ResolveQuestionActionParts['answer'][]).map(
              (answer) => ({
                'text': textBlock(answer![0].toUpperCase() + answer!.slice(1)), // capitalize,
                'value': answer
              })
            )
          } : {
            'type': 'button',
            'text': textBlock('Undo resolve question'),
            'action_id': toActionId({
              action: 'undoResolve',
              questionId: question.id,
            }),
          }
        ),
        {
          'type': 'button',
          'text': textBlock('Edit'),
          'action_id': toActionId({
            action: 'editQuestionBtn',
            questionId: question.id,
          })
        }
      ]
    },
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