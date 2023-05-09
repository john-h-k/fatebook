import clsx from "clsx"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { trpc } from "../lib/web/trpc"
import { FormattedDate } from "./FormattedDate"
import { Username } from "./Username"

export function Questions() {
  const session = useSession()

  const questions = trpc.question.getQuestionsUserCreatedOrForecastedOn.useQuery({
    userId: session.data?.user.id
  })

  if (!session.data?.user.id) {
    return <></>
  }

  if (!questions.data) {
    return <></>
  }

  return (
    <div>
      <h3 className="mb-2">Your forecasts</h3>
      <div className="grid gap-4">
        {questions.data.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        ).map((question) => (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-1" key={question.id}>
            <span className="col-span-2 xl:col-span-1 font-semibold" key={`${question.id}title`}>
              <Link href={`q/${question.id}`}>{question.title}</Link>
            </span>
            <div className="grid grid-cols-3">
              <span className="text-sm" key={`${question.id}author`}>
                <Username user={question.profile.user} />
              </span>
              {
                question.resolvedAt ? (
                  <span className="text-sm text-gray-400" key={`${question.id}resolve`}>
                    <span>Resolved</span> <FormattedDate date={question.resolvedAt} />
                  </span>
                ) : (
                  <span className={clsx(
                    "text-sm text-gray-400",
                    question.resolveBy < new Date() && "text-indigo-300"
                  )} key={`${question.id}resolve`}>
                    <span>Resolves</span> <FormattedDate date={question.resolveBy} />
                  </span>
                )
              }
              <span className="text-sm" key={`${question.id}resolution`}>
                {question.resolution}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}