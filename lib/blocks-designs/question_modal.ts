import { Question } from '@prisma/client'
import { ActionsBlock, ModalView } from '@slack/types'
import { getDateYYYYMMDD } from '../../lib/_utils'
import { textBlock, toActionId } from './_block_utils'

export function buildEditQuestionModalView(question: Partial<Question>, isCreating: boolean, channel: string): ModalView {
  return {
    'type': 'modal',
    'callback_id': `question_modal${toActionId({
      action: 'qModal',
      questionId: question?.id,
      isCreating,
      channel,
    })}`,
    'title': textBlock(`${isCreating ? 'Create' : 'Edit'} forecast question`),
    'submit': textBlock(isCreating ? 'Submit' : 'Save changes'),
    'close': textBlock('Cancel'),
    'blocks': [
      {
        'type': 'input',
        'label': textBlock('Question'),
        'element': {
          'type': 'plain_text_input',
          'action_id': 'forecast_question',
          'placeholder': textBlock('"Will humans walk on Mars by 2050?"'),
          'initial_value': question?.title || '',
        },
      },
      {
        'block_id': 'resolution_date',
        'type': 'input',
        'label': textBlock('When should I remind you to resolve this question?'),
        'element': {
          'type': 'datepicker',
          'initial_date': getDateYYYYMMDD(
            question?.resolveBy || new Date(Date.now() + ( 3600 * 1000 * 24))  // default = tomorrow
          ),
          'placeholder': textBlock('Select a date'),
          'action_id': toActionId({
            action: 'updateResolutionDate',
          })
        },
      },
      {
        'type': 'input',
        'label': textBlock('Notes'),
        'element': {
          'type': 'plain_text_input',
          'action_id': 'notes',
          'placeholder': textBlock(' '),
          'multiline': true,
          'initial_value': question?.notes || '',
        },
        'optional': true,
      },
      // TODO - add options like this:
      // {
      //   'type': 'input',
      //   'element': {
      //     'type': 'checkboxes',
      //     'options': [
      //       {
      //         'text': textBlock('Delphi mode: Hide other people\'s forecasts until you forecast'),
      //         'value': 'value-0'
      //       }
      //     ],
      //     'action_id': 'checkboxes-action'
      //   },
      //   'label': textBlock('Options')
      // },
      ...(isCreating ? [] : [{ // only show delete button if editing
        'type': 'actions',
        'elements': [
          {
            'type': 'button',
            'style': 'danger',
            'text': textBlock('Delete question'),
            confirm: {
              title: textBlock("Delete question?"),
              text: textBlock("Are you sure you want to delete this question?"),
              confirm: textBlock("Delete"),
              deny: textBlock("Cancel"),
              style: "danger",
            },
            'action_id': toActionId({
              action: 'deleteQuestion',
              questionId: question.id || 0,
            })
          },
        ]
      } as ActionsBlock]),
    ]
  }
}