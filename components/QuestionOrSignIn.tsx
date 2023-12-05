import { useSession } from "next-auth/react"
import { NextSeo } from "next-seo"
import { useQuestionId } from "../lib/web/question_url"
import { api } from "../lib/web/trpc"
import { signInToFatebook, truncateString } from "../lib/web/utils"
import { Question as QuestionComp } from "./Question"

export function QuestionOrSignIn({ embedded, alwaysExpand }: { embedded: boolean, alwaysExpand: boolean }) {
  const { data: session, status: authStatus } = useSession()

  const questionId = useQuestionId()
  const qQuery = api.question.getQuestion.useQuery({ questionId }, { retry: false })
  const question = qQuery.data

  if (authStatus === "loading" || qQuery.isLoading) {
    return <span className="text-neutral-200 italic text-sm ml-4 mt-8">
      Loading...
    </span>
  }

  // check signed in
  if (!session?.user.id && (embedded || !question?.sharedPublicly)) {
    return (
      embedded ?
        <div className="flex h-full items-center justify-center">
          <h3 className="text-neutral-600">
            <a className="font-bold" href="/" target="_blank">Sign in </a>to view this question
          </h3>
        </div>
        :
        <h3 className="text-neutral-600">
          <a className="font-bold" href="#" onClick={() => void signInToFatebook()}>Sign in </a> to view this question
        </h3>
    )
  }

  // check we got the question okay
  if ((qQuery.status === "error" || (qQuery.status === "success" && !question))) {
    return <h3 className="text-neutral-600">{
      `This question doesn't exist or ` +
      (session?.user.email ?
        `your account (${session?.user.email}) doesn't have access`
        : `you need to sign in`)
    }</h3>
  } else if (!question) {
    return null
  }

  // we have a user and a question, let's go!
  return (
    <div className="grid grid-cols-1" key={question.id}>
      <NextSeo title={truncateString(question?.title, 60)} />
      <QuestionComp embedded={embedded} question={question} alwaysExpand={alwaysExpand} />
    </div>
  )
}