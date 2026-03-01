"use client"

import { useState, useMemo, useEffect } from "react"
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns"
import type { Profile, Commitment } from "@/lib/types"

interface FamilyCalendarProps {
  profiles: Profile[]
  commitments: Commitment[]
  currentProfile?: Profile
}

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function FamilyCalendar({ profiles, commitments, currentProfile }: FamilyCalendarProps) {
  const today = new Date()
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(today, { weekStartsOn: 1 })
  )
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const dow = today.getDay()
    return dow === 0 ? 6 : dow - 1
  })
  const [filteredUsers, setFilteredUsers] = useState<Set<string> | null>(null) // null = show all
  const [generating, setGenerating] = useState<"this" | "next" | null>(null)
  const [genResult, setGenResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    setGenResult(null)
  }, [currentWeek])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))
  const isAdmin = currentProfile?.role === "admin"

  async function generateJobs(weekDate: Date) {
    const which = weekDate === currentWeek ? "this" : "next"
    setGenerating(which)
    setGenResult(null)
    const weekStr = format(weekDate, "yyyy-MM-dd")
    const res = await fetch("/api/admin/generate-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStr }),
    })
    const json = await res.json()
    setGenResult({
      ok: res.ok && !json.error,
      msg: json.message ?? (json.error ? `Error: ${json.error}` : "Done!"),
    })
    setGenerating(null)
  }

  const nextWeek = addWeeks(currentWeek, 1)

  function toggleUser(userId: string) {
    setFilteredUsers((prev) => {
      if (prev === null) {
        // Currently showing all → show only this one
        return new Set([userId])
      }
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
        return next.size === 0 ? null : next
      } else {
        next.add(userId)
        return next
      }
    })
  }

  function isUserActive(userId: string) {
    return filteredUsers === null || filteredUsers.has(userId)
  }

  const eventsForDay = useMemo(() => {
    return weekDays.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      const recurDay = day.getDay() // 0=Sun..6=Sat
      return commitments
        .filter((c) => {
          if (filteredUsers !== null && !filteredUsers.has(c.user_id)) return false
          if (c.roster_week) return c.roster_week === format(currentWeek, "yyyy-MM-dd") && (c.recur_days?.includes(recurDay) ?? false)
          if (c.is_recurring) return c.recur_days?.includes(recurDay) ?? false
          return c.specific_date === dayStr
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    })
  }, [weekDays, commitments, filteredUsers, currentWeek])

  function EventPill({ event, compact = false }: { event: Commitment; compact?: boolean }) {
    const person = profiles.find((p) => p.id === event.user_id)
    if (!person) return null
    return (
      <div
        className={`rounded-lg text-white font-medium ${compact ? "px-1.5 py-1" : "px-3 py-2"}`}
        style={{ backgroundColor: person.colour }}
        title={`${person.name}: ${event.title} (${event.start_time.slice(0, 5)}–${event.end_time.slice(0, 5)})`}
      >
        {compact ? (
          <>
            <p className="text-[10px] font-semibold truncate leading-tight">{event.title}</p>
            <p className="text-[9px] opacity-75 leading-tight">
              {event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{event.title}</span>
              <span className="text-xs opacity-80 flex-shrink-0">
                {event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}
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

      {/* ── Admin: generate jobs ── */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-sand bg-limestone/60">
          <span className={`text-xs flex-1 min-w-0 ${genResult ? (genResult.ok ? "text-green-700" : "text-red-600") : "text-muted-foreground"}`}>
            {genResult ? genResult.msg : "Generate task assignments for a week"}
          </span>
          <button
            onClick={() => generateJobs(currentWeek)}
            disabled={generating !== null}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: "#1B4F72" }}
          >
            {generating === "this" ? "Generating…" : "Generate This Week"}
          </button>
          <button
            onClick={() => generateJobs(nextWeek)}
            disabled={generating !== null}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: "#2E86AB" }}
          >
            {generating === "next" ? "Generating…" : "Generate Next Week →"}
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-sand">
        <button
          onClick={() => setFilteredUsers(null)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
            filteredUsers === null
              ? "bg-ocean-deep text-white border-ocean-deep"
              : "bg-white text-dusk border-sand hover:border-ocean-deep/50"
          }`}
        >
          All
        </button>
        {profiles.map((p) => {
          const active = isUserActive(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggleUser(p.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                active
                  ? "text-white border-transparent"
                  : "bg-white text-muted-foreground border-sand opacity-50 hover:opacity-75"
              }`}
              style={active ? { backgroundColor: p.colour, borderColor: p.colour } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: active ? "rgba(255,255,255,0.6)" : p.colour }}
              />
              {p.name}
            </button>
          )
        })}
      </div>

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
