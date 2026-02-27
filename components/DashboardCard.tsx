"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ScoreBadge } from "./ScoreBadge"
import type { TaskAssignment } from "@/lib/types"

interface DashboardCardProps {
  assignments: TaskAssignment[]
  userId: string
}

export function DashboardCard({ assignments, userId }: DashboardCardProps) {
  const [localAssignments, setLocalAssignments] = useState<TaskAssignment[]>(assignments)
  const supabase = createClient()

  async function toggleComplete(assignment: TaskAssignment) {
    const newCompleted = !assignment.completed
    const completedAt = newCompleted ? new Date().toISOString() : null

    // Optimistic update
    setLocalAssignments((prev) =>
      prev.map((a) =>
        a.id === assignment.id
          ? { ...a, completed: newCompleted, completed_at: completedAt }
          : a
      )
    )

    await supabase
      .from("task_assignments")
      .update({ completed: newCompleted, completed_at: completedAt })
      .eq("id", assignment.id)
      .eq("user_id", userId)
  }

  const pending = localAssignments.filter((a) => !a.completed)
  const done = localAssignments.filter((a) => a.completed)

  if (localAssignments.length === 0) return null

  return (
    <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
        <h2
          className="text-lg font-bold text-ocean-deep"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Today&apos;s Jobs
        </h2>
        <span className="text-sm text-muted-foreground">
          {done.length}/{localAssignments.length} done
        </span>
      </div>

      <div className="divide-y divide-sand/50">
        {pending.map((a) => (
          <TaskRow key={a.id} assignment={a} onToggle={toggleComplete} />
        ))}
        {done.length > 0 && pending.length > 0 && (
          <div className="px-5 py-2 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Completed
            </p>
          </div>
        )}
        {done.map((a) => (
          <TaskRow key={a.id} assignment={a} onToggle={toggleComplete} />
        ))}
      </div>
    </div>
  )
}

function TaskRow({
  assignment,
  onToggle,
}: {
  assignment: TaskAssignment
  onToggle: (a: TaskAssignment) => void
}) {
  return (
    <button
      onClick={() => onToggle(assignment)}
      className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-limestone/60 transition-colors text-left"
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          assignment.completed
            ? "bg-fern border-fern"
            : "border-mist"
        }`}
      >
        {assignment.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Task name */}
      <span
        className={`flex-1 text-sm font-medium ${
          assignment.completed ? "line-through text-muted-foreground" : "text-dusk"
        }`}
      >
        {assignment.task?.name ?? "Task"}{assignment.label ? ` (${assignment.label})` : ""}
      </span>

      {/* Score */}
      {assignment.task?.score && (
        <ScoreBadge score={assignment.task.score} />
      )}
    </button>
  )
}
