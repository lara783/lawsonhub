"use client"

import { useState, useMemo } from "react"
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns"
import type { Profile, Commitment } from "@/lib/types"

interface FamilyCalendarProps {
  profiles: Profile[]
  commitments: Commitment[]
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function FamilyCalendar({ profiles, commitments }: FamilyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))

  const eventsForDay = useMemo(() => {
    return weekDays.map((day) => {
      const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1 // Mon=0..Sun=6
      const dayStr = format(day, "yyyy-MM-dd")

      return commitments.filter((c) => {
        if (c.is_recurring) {
          const recurDay = day.getDay() // 0=Sun..6=Sat
          return c.recur_days?.includes(recurDay) ?? false
        }
        return c.specific_date === dayStr
      })
    })
  }, [weekDays, commitments])

  return (
    <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sand">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-2 rounded-xl hover:bg-limestone transition-colors text-dusk"
        >
          ←
        </button>
        <h2
          className="text-base font-semibold text-ocean-deep"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {format(currentWeek, "d MMM")} – {format(addDays(currentWeek, 6), "d MMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-2 rounded-xl hover:bg-limestone transition-colors text-dusk"
        >
          →
        </button>
      </div>

      {/* Day columns header */}
      <div className="grid grid-cols-7 border-b border-sand">
        {weekDays.map((day, i) => {
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
          return (
            <div key={i} className={`px-2 py-3 text-center border-r last:border-r-0 border-sand ${isToday ? "bg-seafoam/20" : ""}`}>
              <p className="text-xs text-muted-foreground font-medium">{DAY_NAMES[i]}</p>
              <p className={`text-sm font-bold mt-0.5 ${isToday ? "text-ocean-mid" : "text-dusk"}`}>
                {format(day, "d")}
              </p>
            </div>
          )
        })}
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-7 min-h-64">
        {eventsForDay.map((dayEvents, dayIdx) => (
          <div
            key={dayIdx}
            className="border-r last:border-r-0 border-sand p-1.5 space-y-1 min-h-24"
          >
            {dayEvents.map((event) => {
              const person = profiles.find((p) => p.id === event.user_id)
              if (!person) return null
              return (
                <div
                  key={event.id}
                  className="rounded-lg px-2 py-1 text-white text-xs font-medium truncate"
                  style={{ backgroundColor: person.colour }}
                  title={`${person.name}: ${event.title} (${event.start_time}–${event.end_time})`}
                >
                  <span className="block text-[10px] opacity-80">{person.name}</span>
                  <span className="block truncate">{event.title}</span>
                  <span className="block text-[10px] opacity-80">
                    {event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
