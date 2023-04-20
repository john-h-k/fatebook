import { Resolution } from '@prisma/client'
import { QuestionWithAuthorAndSlackMessages } from '../../prisma/additional'
import { markdownBlock, dividerBlock, feedbackOverflow, getQuestionTitleLink } from './_block_utils.js'
import { feedbackFormUrl, slackAppId } from '../_constants.js'
import { formatDecimalNicely, getResolutionEmoji, resolutionToString } from '../_utils.js'
import type { Blocks } from './_block_utils.js'

type ResolveQuestionDetails = {
  brierScore: number
  rBrierScore: number
  ranking: number
  totalParticipants: number
  lastForecast: number
  lastForecastDate: string
  overallBrierScore: number
  overallRBrierScore: number
}

export async function buildQuestionResolvedBlocks(teamId: string, question: QuestionWithAuthorAndSlackMessages, details : ResolveQuestionDetails) {
  const questionResolution = resolutionToString(question.resolution!)
  const questionLink       = await getQuestionTitleLink(teamId, question)
  return [
    {
      'type': 'section',
      'text': markdownBlock(`${questionLink} *resolved ${questionResolution} ${getResolutionEmoji(question.resolution)}*`),
      'accessory': feedbackOverflow()
    },
    {
      'type': 'context',
      'elements': [
        markdownBlock(`Resolved by <@${question.profile.slackId}>`)
      ],
      // 'accessory': feedbackOverflow()
    },
    dividerBlock(),
    ...(((question.resolution!) != Resolution.AMBIGUOUS) ? generateNonAmbiguousResolution(details) : generateAmbiguousResolution()),
    dividerBlock(),
    {
      'type': 'context',
      'elements': [
        markdownBlock(`<slack://app?team=${teamId}&id=${slackAppId}&tab=home|See your full forecasting history.>`),
        markdownBlock(`_Thanks for using our bot! We'd love to <${feedbackFormUrl}/|hear your feedback>_`)
      ]
    }
  ]
}

function generateNonAmbiguousResolution(details : ResolveQuestionDetails) : Blocks {
  return [
    {
      'type': 'section',
      'fields': [
        markdownBlock(`*Brier score* _(<https://en.wikipedia.org/wiki/Brier_score|Lower is better>)_\n ${formatDecimalNicely(details.brierScore, 6)}`),
        markdownBlock(`*Relative Brier score*\n ${formatDecimalNicely(details.rBrierScore, 6)}`),
        markdownBlock(`*Ranking*\n *${details.ranking}*/${details.totalParticipants}`),
        markdownBlock(`*Your last forecast*\n ${details.lastForecast}% _at ${details.lastForecastDate}_`)
      ]
    },
    dividerBlock(),
    {
      'type': 'section',
      'fields': [
        markdownBlock(`*Brier score across all questions:*\n ${formatDecimalNicely(details.overallBrierScore, 6)}`),
        markdownBlock(`*Relative Brier score across all questions:*\n ${formatDecimalNicely(details.overallRBrierScore, 6)}`)
      ]
    }
  ]
}

function generateAmbiguousResolution() : Blocks {
  return [
    {
      'type': 'section',
      'text': markdownBlock(`No scoring due to ambiguous resolution!`),
    }
  ]
}
