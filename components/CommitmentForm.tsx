"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, startOfWeek } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const TYPES = ["work", "school", "sport", "other"] as const
type ScheduleType = "recurring" | "one-off" | "roster"

interface CommitmentFormProps {
  userId: string
  userColour: string
  defaultScheduleType?: ScheduleType
}

export function CommitmentForm({ userId, userColour, defaultScheduleType = "recurring" }: CommitmentFormProps) {
  const [title, setTitle] = useState("")
  const [type, setType] = useState<typeof TYPES[number]>("work")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [scheduleType, setScheduleType] = useState<ScheduleType>(defaultScheduleType)
  const [recurDays, setRecurDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [specificDate, setSpecificDate] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  function toggleDay(day: number) {
    setRecurDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from("commitments").insert({
      user_id: userId,
      title,
      commitment_type: type,
      start_time: startTime,
      end_time: endTime,
      is_recurring: scheduleType === "recurring",
      recur_days: scheduleType !== "one-off" ? recurDays : [],
      specific_date: scheduleType === "one-off" ? specificDate : null,
      roster_week: scheduleType === "roster" ? currentWeekStart : null,
    })

    if (!error) {
      setTitle("")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-sand shadow-sm p-5 space-y-4"
      style={{ borderLeft: `4px solid ${userColour}` }}
    >
      <h2
        className="font-semibold text-ocean-deep"
        style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
      >
        Add Commitment
      </h2>

      <div className="space-y-2">
        <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Work shift, Footy training"
          required
          className="bg-limestone border-sand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof TYPES[number])}
            className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Schedule</Label>
          <div className="flex rounded-xl overflow-hidden border border-sand">
            {(["recurring", "one-off", "roster"] as ScheduleType[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScheduleType(s)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  scheduleType === s ? "bg-ocean-deep text-white" : "bg-limestone text-dusk"
                }`}
              >
                {s === "recurring" ? "Weekly" : s === "one-off" ? "One-off" : "Roster"}
              </button>
            ))}
          </div>
          {scheduleType === "roster" && (
            <p className="text-xs text-muted-foreground">
              Roster shifts only apply this week — they won&apos;t carry over.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Start</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-limestone border-sand"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">End</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-limestone border-sand"
          />
        </div>
      </div>

      {scheduleType === "one-off" ? (
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Date</Label>
          <Input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            required
            className="bg-limestone border-sand"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">
            {scheduleType === "roster" ? "Days this week" : "Days"}
          </Label>
          <div className="flex gap-1.5">
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  recurDays.includes(i)
                    ? "text-white"
                    : "bg-limestone text-muted-foreground hover:bg-sand"
                }`}
                style={recurDays.includes(i) ? { backgroundColor: userColour } : {}}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl"
        style={{ background: userColour, color: "white" }}
      >
        {loading ? "Saving…" : "Add Commitment"}
      </Button>
    </form>
  )
}
