"use client"

import { useState, useMemo } from "react"
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns"
import type { Profile, Commitment } from "@/lib/types"

interface FamilyCalendarProps {
  profiles: Profile[]
  commitments: Commitment[]
}

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function FamilyCalendar({ profiles, commitments }: FamilyCalendarProps) {
  const today = new Date()
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(today, { weekStartsOn: 1 })
  )
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    // Default to today if in current week, else Monday
    const dow = today.getDay()
    return dow === 0 ? 6 : dow - 1
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))

  const eventsForDay = useMemo(() => {
    return weekDays.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      const recurDay = day.getDay() // 0=Sun..6=Sat
      return commitments.filter((c) => {
        if (c.roster_week) return c.roster_week === format(currentWeek, "yyyy-MM-dd") && (c.recur_days?.includes(recurDay) ?? false)
        if (c.is_recurring) return c.recur_days?.includes(recurDay) ?? false
        return c.specific_date === dayStr
      })
    })
  }, [weekDays, commitments])

  function EventPill({ event, compact = false }: { event: Commitment; compact?: boolean }) {
    const person = profiles.find((p) => p.id === event.user_id)
    if (!person) return null
    return (
      <div
        className={`rounded-lg text-white font-medium ${compact ? "px-1.5 py-0.5" : "px-3 py-2"}`}
        style={{ backgroundColor: person.colour }}
        title={`${person.name}: ${event.title} (${event.start_time.slice(0,5)}–${event.end_time.slice(0,5)})`}
      >
        {compact ? (
          <span className="block text-[10px] truncate">{person.name}</span>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{event.title}</span>
              <span className="text-xs opacity-80 flex-shrink-0">
                {event.start_time.slice(0,5)}–{event.end_time.slice(0,5)}
              </span>
            </div>
            <span className="text-xs opacity-80">{person.name}</span>
          </>
        )}
      </div>
    )
  }

  const WeekNav = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-sand">
      <button
        onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
        className="p-2 rounded-xl hover:bg-limestone transition-colors text-dusk font-bold text-lg"
      >
        ←
      </button>
      <h2
        className="text-sm font-semibold text-ocean-deep"
        style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
      >
        {format(currentWeek, "d MMM")} – {format(addDays(currentWeek, 6), "d MMM yyyy")}
      </h2>
      <button
        onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
        className="p-2 rounded-xl hover:bg-limestone transition-colors text-dusk font-bold text-lg"
      >
        →
      </button>
    </div>
  )

  return (
    <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
      <WeekNav />

      {/* ── MOBILE: day tabs + single-day list ── */}
      <div className="md:hidden">
        {/* Day strip */}
        <div className="grid grid-cols-7 border-b border-sand">
          {weekDays.map((day, i) => {
            const isSelected = i === selectedDayIndex
            const isToday = isSameDay(day, today)
            const count = eventsForDay[i].length
            return (
              <button
                key={i}
                onClick={() => setSelectedDayIndex(i)}
                className={`flex flex-col items-center py-2.5 transition-colors ${
                  isSelected ? "bg-ocean-deep text-white" : isToday ? "bg-seafoam/20" : ""
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isSelected ? "text-white/80" : "text-muted-foreground"
                }`}>
                  {DAY_NAMES_SHORT[i]}
                </span>
                <span className={`text-sm font-bold mt-0.5 ${
                  isSelected ? "text-white" : isToday ? "text-ocean-mid" : "text-dusk"
                }`}>
                  {format(day, "d")}
                </span>
                {count > 0 && (
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white/70" : "bg-ocean-mid"
                  }`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day events */}
        <div className="p-4 min-h-40 space-y-2">
          {eventsForDay[selectedDayIndex].length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">🏖️</span>
              <p className="text-sm text-muted-foreground">Nothing on {DAY_NAMES_SHORT[selectedDayIndex]}</p>
            </div>
          ) : (
            eventsForDay[selectedDayIndex].map((event) => (
              <EventPill key={event.id} event={event} compact={false} />
            ))
          )}
        </div>
      </div>

      {/* ── DESKTOP: 7-column grid ── */}
      <div className="hidden md:block">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-sand">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={i} className={`px-2 py-3 text-center border-r last:border-r-0 border-sand ${isToday ? "bg-seafoam/20" : ""}`}>
                <p className="text-xs text-muted-foreground font-medium">{DAY_NAMES_SHORT[i]}</p>
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
            <div key={dayIdx} className="border-r last:border-r-0 border-sand p-1.5 space-y-1 min-h-24">
              {dayEvents.map((event) => (
                <EventPill key={event.id} event={event} compact={true} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
