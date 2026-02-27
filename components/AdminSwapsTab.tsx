"use client"

import { useState } from "react"
import type { JobSwapRequest, Profile, TaskAssignment } from "@/lib/types"

interface Props {
  swapRequests: JobSwapRequest[]
  profiles: Profile[]
  assignments: TaskAssignment[]
  weekStart: string
}

export function AdminSwapsTab({ swapRequests: initialRequests, profiles, assignments, weekStart }: Props) {
  const [requests, setRequests] = useState<JobSwapRequest[]>(initialRequests)
  const [resolving, setResolving] = useState<string | null>(null)

  // Direct reassign state
  const [selectedAssignment, setSelectedAssignment] = useState<TaskAssignment | null>(null)
  const [reassignTo, setReassignTo] = useState<string>("")
  const [reassigning, setReassigning] = useState(false)
  const [reassignResult, setReassignResult] = useState<string | null>(null)

  const pending = requests.filter((r) => r.status === "pending")
  const resolved = requests.filter((r) => r.status !== "pending")

  function profileName(id: string) {
    return profiles.find((p) => p.id === id)?.name ?? "Unknown"
  }
  function profileColour(id: string) {
    return profiles.find((p) => p.id === id)?.colour ?? "#ccc"
  }
  function assignmentLabel(a?: TaskAssignment) {
    if (!a) return "—"
    const name = a.label ? `${a.task?.name ?? "?"} (${a.label})` : (a.task?.name ?? "?")
    return `${name} (${a.task?.score ?? "?"} pts, ${a.assigned_date})`
  }

  async function resolve(swapId: string, action: "approve" | "reject") {
    setResolving(swapId)
    const res = await fetch("/api/admin/swaps/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swapId, action }),
    })
    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === swapId ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r
        )
      )
    }
    setResolving(null)
  }

  // For direct reassignment: eligible people are those whose score matches ±1
  const eligibleForReassign = selectedAssignment
    ? profiles.filter((p) => {
        const score = selectedAssignment.task?.score ?? 0
        // Allow reassigning to anyone — admin has full control, score hint shown
        return p.id !== selectedAssignment.user_id
      })
    : []

  async function handleReassign() {
    if (!selectedAssignment || !reassignTo) return
    setReassigning(true)
    setReassignResult(null)

    const res = await fetch("/api/admin/reassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: selectedAssignment.id, newUserId: reassignTo }),
    })

    const data = await res.json()
    setReassignResult(res.ok ? "Reassigned successfully — refresh to see changes." : (data.error ?? "Error"))
    if (res.ok) {
      setSelectedAssignment(null)
      setReassignTo("")
    }
    setReassigning(false)
  }

  return (
    <div className="space-y-6">
      {/* Pending swap requests */}
      <div>
        <h3 className="text-sm font-semibold text-dusk mb-3">
          Pending Swap Requests {pending.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-cliff-gold/20 text-cliff-gold rounded-full text-xs">{pending.length}</span>
          )}
        </h3>

        {pending.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No pending swap requests.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-sand bg-limestone p-3 space-y-2">
                <div className="flex items-start gap-2 text-xs text-dusk">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: profileColour(r.requester_id) }} />
                    <span className="font-semibold">{profileName(r.requester_id)}</span>
                    <span className="text-muted-foreground">wants to give</span>
                    <span className="font-medium truncate">{assignmentLabel(r.requester_assignment)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-dusk ml-3.5">
                  <span className="text-muted-foreground">in exchange for</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: profileColour(r.target_id) }} />
                  <span className="font-semibold">{profileName(r.target_id)}</span>
                  <span className="font-medium truncate">{assignmentLabel(r.target_assignment)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => resolve(r.id, "approve")}
                    disabled={resolving === r.id}
                    className="flex-1 py-1.5 rounded-lg bg-rainforest text-white text-xs font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
                  >
                    {resolving === r.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => resolve(r.id, "reject")}
                    disabled={resolving === r.id}
                    className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-semibold disabled:opacity-60 hover:bg-red-50 transition-colors"
                  >
                    {resolving === r.id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct reassignment */}
      <div>
        <h3 className="text-sm font-semibold text-dusk mb-3">Direct Reassignment</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Pick any assignment from this week and reassign it. Aim to keep scores balanced (±1 pt).
        </p>

        <div className="space-y-2">
          <div>
            <label className="text-xs font-semibold text-dusk uppercase tracking-wide block mb-1">Select task to reassign</label>
            <select
              value={selectedAssignment?.id ?? ""}
              onChange={(e) => {
                const a = assignments.find((a) => a.id === e.target.value) ?? null
                setSelectedAssignment(a)
                setReassignTo("")
                setReassignResult(null)
              }}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
            >
              <option value="">— choose a task —</option>
              {assignments
                .sort((a, b) => (a.user?.name ?? "").localeCompare(b.user?.name ?? ""))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.user?.name ?? "?"} · {a.task?.name ?? "?"}{a.label ? ` (${a.label})` : ""} ({a.task?.score ?? "?"} pts, {a.assigned_date})
                  </option>
                ))}
            </select>
          </div>

          {selectedAssignment && (
            <div>
              <label className="text-xs font-semibold text-dusk uppercase tracking-wide block mb-1">Reassign to</label>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
              >
                <option value="">— choose person —</option>
                {eligibleForReassign.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {reassignResult && (
            <p className={`text-xs font-medium ${reassignResult.includes("success") ? "text-rainforest" : "text-red-500"}`}>
              {reassignResult}
            </p>
          )}

          {selectedAssignment && reassignTo && (
            <button
              onClick={handleReassign}
              disabled={reassigning}
              className="w-full py-2 rounded-xl bg-ocean-mid text-white text-sm font-semibold disabled:opacity-60 hover:bg-ocean-deep transition-colors"
            >
              {reassigning ? "Reassigning…" : "Reassign Task"}
            </button>
          )}
        </div>
      </div>

      {/* Recent resolved */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-dusk mb-2">Recent</h3>
          <div className="space-y-1.5">
            {resolved.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${
                  r.status === "approved" ? "bg-fern/10 text-rainforest" : "bg-red-50 text-red-400"
                }`}>{r.status}</span>
                <span>{profileName(r.requester_id)} ↔ {profileName(r.target_id)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
