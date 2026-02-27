"use client"

import { useState } from "react"
import { format, addDays } from "date-fns"
import { UserAvatar } from "./UserAvatar"
import { SwapModal } from "./SwapModal"
import type { Profile, TaskAssignment, JobSwapRequest } from "@/lib/types"

interface WeekJobBoardProps {
  profiles: Profile[]
  assignments: TaskAssignment[]
  currentUserId: string
  weekStart: string
  swapRequests?: JobSwapRequest[]
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function WeekJobBoard({
  profiles,
  assignments,
  currentUserId,
  weekStart,
  swapRequests = [],
}: WeekJobBoardProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart), i), "yyyy-MM-dd")
  )
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const todayIndex = weekDays.indexOf(todayStr)

  const [activePersonId, setActivePersonId] = useState<string | null>(null)
  const [activeDayIndex, setActiveDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0)
  const [swapAssignment, setSwapAssignment] = useState<TaskAssignment | null>(null)

  const pendingRequesterIds = new Set(
    swapRequests
      .filter((r) => r.requester_id === currentUserId && r.status === "pending")
      .map((r) => r.requester_assignment_id)
  )

  function taskDisplayName(a: TaskAssignment) {
    return a.task?.name
      ? `${a.task.name}${a.label ? ` (${a.label})` : ""}`
      : "Task"
  }

  const activePerson = profiles.find((p) => p.id === activePersonId) ?? null

  // ─── SINGLE PERSON FULL VIEW ──────────────────────────────────────────────
  if (activePerson) {
    const personAssignments = assignments.filter((a) => a.user_id === activePerson.id)
    const totalScore = personAssignments.reduce((s, a) => s + (a.task?.score ?? 0), 0)
    const completedScore = personAssignments
      .filter((a) => a.completed)
      .reduce((s, a) => s + (a.task?.score ?? 0), 0)
    const activeDayStr = weekDays[activeDayIndex]
    const dayTasks = personAssignments.filter((a) => a.assigned_date === activeDayStr)
    const isMe = activePerson.id === currentUserId

    return (
      <div className="space-y-4">
        {/* Back + person header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePersonId(null)}
            className="text-sm text-ocean-mid hover:text-ocean-deep transition-colors font-medium flex items-center gap-1"
          >
            ← All
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <UserAvatar
              name={activePerson.name}
              colour={activePerson.colour}
              initials={activePerson.avatar_initials}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-dusk">{activePerson.name}</span>
                {isMe && (
                  <span className="text-xs bg-seafoam text-ocean-deep px-2 py-0.5 rounded-full font-medium">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {completedScore}/{totalScore} pts · {personAssignments.length} tasks this week
              </p>
            </div>
          </div>
        </div>

        {/* Week progress bar */}
        <div className="h-2 bg-sand rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: totalScore > 0 ? `${(completedScore / totalScore) * 100}%` : "0%",
              backgroundColor: activePerson.colour,
            }}
          />
        </div>

        {/* Day tab strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((dayStr, i) => {
            const isActive = i === activeDayIndex
            const isToday = dayStr === todayStr
            const count = personAssignments.filter((a) => a.assigned_date === dayStr).length
            return (
              <button
                key={dayStr}
                onClick={() => setActiveDayIndex(i)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "text-white shadow-sm"
                    : isToday
                    ? "bg-seafoam/30 text-ocean-mid"
                    : "bg-white border border-sand text-muted-foreground hover:border-ocean-mid hover:text-dusk"
                }`}
                style={isActive ? { backgroundColor: activePerson.colour } : {}}
              >
                <span className="text-[11px] uppercase tracking-wide">{DAY_LABELS[i]}</span>
                <span className={`text-[10px] font-bold ${isActive ? "text-white/80" : count > 0 ? "text-dusk" : "text-muted-foreground/50"}`}>
                  {count > 0 ? count : "·"}
                </span>
              </button>
            )
          })}
        </div>

        {/* Task cards for the selected day */}
        <div className="space-y-2 min-h-24">
          {dayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks this day 🏖️</p>
          ) : (
            dayTasks.map((a) => {
              const hasPendingSwap = pendingRequesterIds.has(a.id)
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    a.completed
                      ? "bg-fern/5 border-fern/20"
                      : "bg-white border-sand"
                  }`}
                  style={!a.completed ? { borderLeft: `4px solid ${activePerson.colour}` } : {}}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        a.completed ? "text-rainforest line-through" : "text-dusk"
                      }`}
                    >
                      {taskDisplayName(a)}
                    </p>
                    {a.task?.estimated_minutes && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ~{a.task.estimated_minutes} min
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        a.completed
                          ? "bg-fern/20 text-rainforest"
                          : "bg-sand text-dusk"
                      }`}
                    >
                      {a.task?.score ?? 0} pts
                    </span>

                    {isMe && !a.completed && (
                      <button
                        onClick={() => setSwapAssignment(a)}
                        disabled={hasPendingSwap}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                          hasPendingSwap
                            ? "bg-cliff-gold/20 text-cliff-gold cursor-default"
                            : "bg-ocean-mid/10 text-ocean-mid hover:bg-ocean-mid hover:text-white"
                        }`}
                        title={hasPendingSwap ? "Swap pending approval" : "Request a swap"}
                      >
                        {hasPendingSwap ? "⏳" : "⇄"}
                      </button>
                    )}

                    {a.completed && (
                      <span className="text-fern text-lg leading-none">✓</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {swapAssignment && (
          <SwapModal
            assignment={swapAssignment}
            allAssignments={assignments}
            currentUserId={currentUserId}
            profiles={profiles}
            onClose={() => setSwapAssignment(null)}
            onRequested={() => setSwapAssignment(null)}
          />
        )}
      </div>
    )
  }

  // ─── EVERYONE VIEW ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Person filter pills */}
      <div className="flex flex-wrap gap-2">
        <button className="bg-ocean-deep text-white px-3 py-1.5 rounded-full text-xs font-semibold">
          Everyone
        </button>
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => { setActiveDayIndex(todayIndex >= 0 ? todayIndex : 0); setActivePersonId(p.id) }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-sand bg-white text-dusk hover:border-ocean-mid transition-colors flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.colour }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Desktop: mini grid per person */}
      <div className="hidden md:block space-y-3">
        {profiles.map((person) => {
          const personAssignments = assignments.filter((a) => a.user_id === person.id)
          const totalScore = personAssignments.reduce((s, a) => s + (a.task?.score ?? 0), 0)
          const completedScore = personAssignments
            .filter((a) => a.completed)
            .reduce((s, a) => s + (a.task?.score ?? 0), 0)
          const isMe = person.id === currentUserId

          return (
            <div
              key={person.id}
              className="rounded-2xl bg-white shadow-sm overflow-hidden border"
              style={{ borderColor: isMe ? person.colour : "#E8DCC8", borderWidth: isMe ? 2 : 1 }}
            >
              {/* Person header — click to expand */}
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-limestone/60 transition-colors"
                style={{ borderLeft: `4px solid ${person.colour}` }}
                onClick={() => { setActiveDayIndex(todayIndex >= 0 ? todayIndex : 0); setActivePersonId(person.id) }}
              >
                <UserAvatar
                  name={person.name}
                  colour={person.colour}
                  initials={person.avatar_initials}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-dusk text-sm">{person.name}</span>
                    {isMe && (
                      <span className="text-xs bg-seafoam text-ocean-deep px-2 py-0.5 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1.5 bg-sand rounded-full w-24 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: totalScore > 0 ? `${(completedScore / totalScore) * 100}%` : "0%",
                          backgroundColor: person.colour,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {completedScore}/{totalScore} pts
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground opacity-60">expand →</span>
              </div>

              {/* 7-day mini grid */}
              <div className="grid grid-cols-7 border-t border-sand">
                {weekDays.map((dayStr, i) => {
                  const dayTasks = personAssignments.filter((a) => a.assigned_date === dayStr)
                  const isToday = dayStr === todayStr
                  return (
                    <div
                      key={dayStr}
                      className={`p-1.5 border-r last:border-r-0 border-sand min-h-14 ${
                        isToday ? "bg-seafoam/10" : ""
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold mb-1 ${
                          isToday ? "text-ocean-mid" : "text-muted-foreground"
                        }`}
                      >
                        {DAY_LABELS[i]}
                      </p>
                      <div className="space-y-0.5">
                        {dayTasks.map((a) => {
                          const isMyTask = a.user_id === currentUserId
                          const hasPendingSwap = pendingRequesterIds.has(a.id)
                          return (
                            <div
                              key={a.id}
                              className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-md ${
                                a.completed
                                  ? "bg-fern/10 text-rainforest line-through"
                                  : isMyTask
                                  ? "bg-limestone text-dusk flex items-center gap-0.5"
                                  : "bg-limestone text-dusk truncate"
                              }`}
                              title={taskDisplayName(a)}
                            >
                              <span className="truncate flex-1">{taskDisplayName(a)}</span>
                              {isMyTask && !a.completed && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSwapAssignment(a) }}
                                  disabled={hasPendingSwap}
                                  className={`flex-shrink-0 ml-0.5 px-1 rounded text-[9px] font-bold leading-tight transition-colors ${
                                    hasPendingSwap
                                      ? "bg-cliff-gold/20 text-cliff-gold cursor-default"
                                      : "bg-ocean-mid/10 text-ocean-mid hover:bg-ocean-mid hover:text-white"
                                  }`}
                                >
                                  {hasPendingSwap ? "⏳" : "⇄"}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: person cards with today's tasks preview */}
      <div className="md:hidden space-y-3">
        {profiles.map((person) => {
          const personAssignments = assignments.filter((a) => a.user_id === person.id)
          const todayTasks = personAssignments.filter((a) => a.assigned_date === todayStr)
          const totalScore = personAssignments.reduce((s, a) => s + (a.task?.score ?? 0), 0)
          const completedScore = personAssignments
            .filter((a) => a.completed)
            .reduce((s, a) => s + (a.task?.score ?? 0), 0)
          const isMe = person.id === currentUserId

          return (
            <div
              key={person.id}
              className="rounded-2xl bg-white shadow-sm overflow-hidden border"
              style={{ borderColor: isMe ? person.colour : "#E8DCC8", borderWidth: isMe ? 2 : 1 }}
            >
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderLeft: `4px solid ${person.colour}` }}
              >
                <UserAvatar
                  name={person.name}
                  colour={person.colour}
                  initials={person.avatar_initials}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-dusk">{person.name}</span>
                    {isMe && (
                      <span className="text-xs bg-seafoam text-ocean-deep px-2 py-0.5 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 bg-sand rounded-full w-20 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: totalScore > 0 ? `${(completedScore / totalScore) * 100}%` : "0%",
                          backgroundColor: person.colour,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {completedScore}/{totalScore} pts
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveDayIndex(todayIndex >= 0 ? todayIndex : 0); setActivePersonId(person.id) }}
                  className="text-xs text-ocean-mid font-semibold px-2.5 py-1.5 rounded-lg bg-ocean-mid/10 hover:bg-ocean-mid hover:text-white transition-colors flex-shrink-0"
                >
                  Full week
                </button>
              </div>

              {/* Today's tasks preview */}
              <div className="px-4 pb-3">
                {todayTasks.length > 0 ? (
                  <>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Today
                    </p>
                    <div className="space-y-1.5">
                      {todayTasks.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: person.colour }}
                          />
                          <span
                            className={`flex-1 text-sm min-w-0 truncate ${
                              a.completed ? "line-through text-rainforest" : "text-dusk"
                            }`}
                          >
                            {taskDisplayName(a)}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {a.task?.score}pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No tasks today</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {swapAssignment && (
        <SwapModal
          assignment={swapAssignment}
          allAssignments={assignments}
          currentUserId={currentUserId}
          profiles={profiles}
          onClose={() => setSwapAssignment(null)}
          onRequested={() => setSwapAssignment(null)}
        />
      )}
    </div>
  )
}
