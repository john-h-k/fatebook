import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { sendEmailReadyToResolveNotification } from '../../pages/api/check_for_message_updates'
import prisma, { backendAnalyticsEvent, getSlackPermalinkFromChannelAndTS } from '../_utils_server'
import { importRouter } from './import_router'
import { questionRouter } from './question_router'
import { publicProcedure, router } from './trpc_base'
import { userListRouter } from './userList_router'


export const appRouter = router({
  question: questionRouter,

  userList: userListRouter,

  import: importRouter,

  sendEmail: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const question = await prisma.question.findUnique({
        where: {
          id: input.questionId,
        },
        include: {
          user: true,
        },
      })
      if (!question) {
        throw new Error('question not found')
      }
      await sendEmailReadyToResolveNotification(question)
    }),

  getSlackPermalink: publicProcedure
    .input(
      z.object({
        teamId: z.string(),
        channel: z.string(),
        ts: z.string(),
      }).optional(),
    )
    .query(async ({ input }) => {
      if (!input) { return null }
      return await getSlackPermalinkFromChannelAndTS(input.teamId, input.channel, input.ts)
    }),

  unsubscribe: publicProcedure
    .input(
      z.object({
        userEmail: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: {
          email: input.userEmail,
        },
      })
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      await prisma.user.update({
        where: {
          email: input.userEmail,
        },
        data: {
          unsubscribedFromEmailsAt: new Date(),
        },
      })

      await backendAnalyticsEvent('email_unsubscribe', {
        platform: 'web',
        email: input.userEmail,
      })
    }),
})

export type AppRouter = typeof appRouter