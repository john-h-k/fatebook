import { z } from "zod"
import prisma from "../_utils"
import { publicProcedure, router } from "./trpc_base"

const HARDCODED_ADAM_PROFILE_ID = 12

export const questionRouter = router({
  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        resolveBy: z.date(),
        prediction: z.number().max(1).min(0),
        authorId: z.number(),
      })
    )
    .mutation(async ({input}) => {
      // todo check authorId = current user

      const question = await prisma.question.create({
        data: {
          ...input,
          authorId: HARDCODED_ADAM_PROFILE_ID, // TODO REMOVE HARDCODE
          forecasts: {
            create: {
              authorId: HARDCODED_ADAM_PROFILE_ID, // TODO REMOVE HARDCODE
              forecast: 0.5,
            }
          }
        },
      })
      return question
    }),

  getQuestion: publicProcedure
    .input(
      z.object({
        questionId: z.number().optional(),
      })
    )
    .query(async ({input}) => {
      if (!input.questionId) {
        return null
      }

      return await prisma.question.findUnique({
        where: {
          id: input.questionId,
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
    }),

  getQuestionsUserCreatedOrForecastedOn: publicProcedure
    .input(
      z.object({
        userId: z.number().optional(),
      })
    )
    .query(async ({input}) => {
      if (!input.userId) {
        return null
      }

      console.log({input})
      return await prisma.question.findMany({
        where: {
          OR: {
            authorId: HARDCODED_ADAM_PROFILE_ID, // input.userId,
            forecasts: {
              some: {
                authorId: HARDCODED_ADAM_PROFILE_ID, // input.userId,
              }
            }
          }
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
    }),
})