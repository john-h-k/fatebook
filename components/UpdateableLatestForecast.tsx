import clsx from "clsx"
import { useRef, useState } from 'react'
import { api } from "../lib/web/trpc"
import { invalidateQuestion, useUserId } from '../lib/web/utils'
import { QuestionWithUserAndForecastsWithUserAndSharedWithAndMessagesAndComments } from "../prisma/additional"

export function UpdateableLatestForecast({
  question,
  autoFocus,
}: {
  question: QuestionWithUserAndForecastsWithUserAndSharedWithAndMessagesAndComments
  autoFocus?: boolean
}) {
  const userId = useUserId()

  const forecasts = question.forecasts.filter(f => f.userId === userId).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
  const latestForecast = (forecasts && forecasts.length > 0) ? forecasts?.[0] : null

  const defaultVal = latestForecast?.forecast ? (latestForecast.forecast.times(100).toString()).toString() : ""
  const [localForecast, setLocalForecast] = useState<string>(defaultVal)

  const utils = api.useContext()
  const addForecast = api.question.addForecast.useMutation({
    async onSuccess() {
      await invalidateQuestion(utils, question)
    }
  })

  const inputRef = useRef(null)

  function updateForecast(newForecastInput: string) {
    const newForecast = parseFloat(newForecastInput) / 100
    if (!isNaN(newForecast) && newForecast > 0 && newForecast < 1
      && (!latestForecast?.forecast || newForecast !== (latestForecast.forecast as unknown as number))) {
      addForecast.mutate({
        questionId: question.id,
        forecast: newForecast,
      })
    }
  }

  if (question.resolution !== null && !latestForecast) return <span></span>

  const localForecastFloat = parseFloat(localForecast)

  return (
    <span
      className={clsx("mr-1.5 font-bold text-2xl h-min focus-within:ring-indigo-800 ring-gray-300 px-1 py-0.5 rounded-md shrink-0 relative",
                      addForecast.isLoading && "opacity-50",
                      question.resolution === null ? "text-indigo-800 ring-2" : "text-gray-600 ring-0")}
      onClick={(e) => {
        (inputRef.current as any)?.focus()
        if (question.resolution === null || addForecast.isLoading) {
          e.stopPropagation()
        }
      }}
    >
      {(question.resolution === null || latestForecast) && <>
        <div
          className={clsx(
            'h-full bg-indigo-700 absolute rounded-l pointer-events-none opacity-20 bg-gradient-to-br transition-all -mx-1 -my-0.5',
            localForecastFloat >= 100 && "rounded-r",
            question.resolution === null && "from-indigo-400 to-indigo-600",
            question.resolution !== null && "hidden",
          )}
          style={{
            width: `${Math.min(Math.max(localForecastFloat || 0, 0), 100)}%`,
          }}
        />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]*"
          className={"pl-1 w-16 text-right rounded-md focus:outline-none bg-transparent"}
          value={localForecast}
          placeholder="__"
          onChange={(e) => {
            setLocalForecast(e.target.value)
          }}
          onClick={(e) => { e.stopPropagation() }} // prevent focus being lost by parent span onClick
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateForecast(e.currentTarget.value)
            }
          }}
          onBlur={(e) => {
            if (defaultVal !== e.currentTarget.value && e.currentTarget.value !== "") {
              updateForecast(e.currentTarget.value)
            } else if (e.currentTarget.value === "" || !e.currentTarget.value) {
              setLocalForecast(defaultVal)
            }
          }}
          disabled={question.resolution !== null || addForecast.isLoading || !userId} />
        <span className={"text-left"}>{"%"}</span>
      </>}
    </span>
  )
}
