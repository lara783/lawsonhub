"use client"

import { useState } from "react"
import type { Profile, TaskAssignment } from "@/lib/types"

interface Props {
  assignment: TaskAssignment
  allAssignments: TaskAssignment[]
  currentUserId: string
  profiles: Profile[]
  onClose: () => void
  onRequested: () => void
}

export function SwapModal({ assignment, allAssignments, currentUserId, profiles, onClose, onRequested }: Props) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const myScore = assignment.task?.score ?? 0
  const myTaskName = assignment.task?.name
    ? `${assignment.task.name}${assignment.label ? ` (${assignment.label})` : ""}`
    : ""

  // Eligible: other people's uncompleted tasks within ±1 point
  const eligible = allAssignments.filter(
    (a) =>
      a.user_id !== currentUserId &&
      !a.completed &&
      Math.abs((a.task?.score ?? 0) - myScore) <= 1
  )

  // Group by person
  const byPerson: Record<string, { profile: Profile; assignments: TaskAssignment[] }> = {}
  for (const a of eligible) {
    if (!byPerson[a.user_id]) {
      const p = profiles.find((p) => p.id === a.user_id)
      if (p) byPerson[a.user_id] = { profile: p, assignments: [] }
    }
    byPerson[a.user_id]?.assignments.push(a)
  }

  async function handleRequest() {
    if (!selectedTargetId) return
    setLoading(true)
    setError(null)

    const res = await fetch("/api/swaps/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterAssignmentId: assignment.id,
        targetAssignmentId: selectedTargetId,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Failed to send request")
    } else {
      setSuccess(true)
      setTimeout(() => { onRequested(); onClose() }, 1200)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-sand flex items-start justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-ocean-deep text-sm">Request Job Swap</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Offering: <span className="font-medium text-dusk">{myTaskName}</span>
              <span className="ml-1 px-1.5 py-0.5 bg-sand rounded text-[10px]">{myScore} pts</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-dusk text-xl leading-none ml-4 flex-shrink-0">×</button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <p className="text-xs text-muted-foreground">Pick a task to swap with (within ±1 point):</p>

          {Object.keys(byPerson).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No eligible tasks to swap with right now.
            </p>
          )}

          {Object.values(byPerson).map(({ profile, assignments }) => (
            <div key={profile.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: profile.colour }} />
                <span className="text-xs font-semibold text-dusk">{profile.name}</span>
              </div>
              <div className="space-y-1 ml-4">
                {assignments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedTargetId(a.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs border transition-colors ${
                      selectedTargetId === a.id
                        ? "border-ocean-mid bg-ocean-mid/10 text-ocean-deep font-medium"
                        : "border-sand bg-limestone text-dusk hover:border-ocean-mid"
                    }`}
                  >
                    <span className="font-medium">{a.task?.name}{a.label ? ` (${a.label})` : ""}</span>
                    <span className="text-muted-foreground ml-2">
                      {a.task?.score} pts · {a.assigned_date}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}
        {success && <p className="px-4 pb-1 text-xs text-rainforest font-medium">Request sent! Waiting for admin approval.</p>}

        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-sand flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-sand text-sm text-dusk hover:bg-sand/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRequest}
            disabled={!selectedTargetId || loading || success}
            className="flex-1 py-2 rounded-xl bg-ocean-mid text-white text-sm font-semibold disabled:opacity-50 hover:bg-ocean-deep transition-colors"
          >
            {loading ? "Sending…" : "Request Swap"}
          </button>
        </div>
      </div>
    </div>
  )
}
