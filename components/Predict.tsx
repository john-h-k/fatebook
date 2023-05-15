import clsx from "clsx"
import { useSession } from "next-auth/react"
import { KeyboardEvent, useEffect } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import TextareaAutosize from 'react-textarea-autosize'
import { z } from "zod"
import { api } from "../lib/web/trpc"

const predictFormSchema = z.object({
  question: z.string().min(1),
  resolveBy: z.date(),
  predictionPercentage: z.number().max(100).min(0),
})
export function Predict() {
  const { register, handleSubmit, setFocus, reset, formState: { errors } } = useForm<z.infer<typeof predictFormSchema>>()
  const session = useSession()
  const utils = api.useContext()
  const createQuestion = api.question.create.useMutation({
    async onSuccess() {
      await utils.question.getQuestionsUserCreatedOrForecastedOn.invalidate({userId: session.data?.user.id})
    }
  })

  const onSubmit: SubmitHandler<z.infer<typeof predictFormSchema>> = (data, e) => {
    e?.preventDefault() // don't reload the page
    console.log({data})
    if (session.data?.user.id) {
      createQuestion.mutate({
        title: data.question,
        resolveBy: data.resolveBy,
        authorId: session.data?.user.id,
        prediction: data.predictionPercentage ? data.predictionPercentage / 100 : undefined,
      })

      reset()
    } else {
      window.alert("You must be signed in to make a prediction.")
    }
  }

  const onEnterSubmit = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSubmit(onSubmit)()
      e.preventDefault()
    }
  }

  useEffect(() => {
    setFocus("question")
  }, [setFocus])
  return (
    <div className="w-full">
      <form onSubmit={void handleSubmit(onSubmit)}>
        <TextareaAutosize
          className={clsx(
            "w-full text-xl border-2 border-gray-300 rounded-md p-4 resize-none",
            errors.question && "border-red-400"
          )}
          autoFocus={true}
          placeholder="Will humans walk on Mars by 2050?"
          maxRows={15}
          onKeyDown={onEnterSubmit}
          {...register("question", { required: true })}
        />

        <div className="flex flex-row gap-2">
          <div>
            <label className="block" htmlFor="resolveBy">Resolve by</label>
            <input
              className={clsx(
                "text-md border-2 border-gray-300 rounded-md p-2 resize-none",
                errors.resolveBy && "border-red-500"
              )}
              type="date"
              defaultValue={
                // tomorrow
                new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
              }
              onKeyDown={onEnterSubmit}
              {...register("resolveBy", { required: true, valueAsDate: true })}
            />
          </div>

          <div>
            <label className="block" htmlFor="resolveBy">Make a prediction</label>
            <input
              className={clsx(
                "text-md border-2 border-gray-300 rounded-md p-2 resize-none",
                errors.predictionPercentage && "border-red-500"
              )}
              placeholder="XX%"
              onKeyDown={onEnterSubmit}
              {...register("predictionPercentage")}
            />
          </div>
        </div>

        <div className="py-4">
          <button onClick={(e) => {e.preventDefault(); void handleSubmit(onSubmit)()}} className="block bg-indigo-600"
            disabled={createQuestion.isLoading || Object.values(errors).some(err => !!err)}
          >
            Predict
          </button>
        </div>
      </form>
    </div>
  )
}