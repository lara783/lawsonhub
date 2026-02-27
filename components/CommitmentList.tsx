"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Commitment } from "@/lib/types"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const TYPES = ["work", "school", "sport", "other"] as const

interface EditState {
  id: string
  title: string
  commitment_type: string
  start_time: string
  end_time: string
  is_recurring: boolean
  recur_days: number[]
  specific_date: string
}

interface Props {
  initialCommitments: Commitment[]
  userColour: string
  weekStart: string
}

export function CommitmentList({ initialCommitments, userColour, weekStart }: Props) {
  // Filter out roster entries from other weeks — they should not appear at all
  const filtered = initialCommitments.filter(
    (c) => !c.roster_week || c.roster_week === weekStart
  )
  const [commitments, setCommitments] = useState<Commitment[]>(filtered)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  function startEdit(c: Commitment) {
    setEditing({
      id: c.id,
      title: c.title,
      commitment_type: c.commitment_type,
      start_time: c.start_time.slice(0, 5),
      end_time: c.end_time.slice(0, 5),
      is_recurring: c.is_recurring,
      recur_days: c.recur_days ?? [],
      specific_date: c.specific_date ?? "",
    })
  }

  function toggleDay(day: number) {
    if (!editing) return
    setEditing((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        recur_days: prev.recur_days.includes(day)
          ? prev.recur_days.filter((d) => d !== day)
          : [...prev.recur_days, day],
      }
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)

    const { error } = await supabase
      .from("commitments")
      .update({
        title: editing.title,
        commitment_type: editing.commitment_type,
        start_time: editing.start_time,
        end_time: editing.end_time,
        is_recurring: editing.is_recurring,
        recur_days: editing.is_recurring ? editing.recur_days : [],
        specific_date: editing.is_recurring ? null : editing.specific_date || null,
      })
      .eq("id", editing.id)

    if (!error) {
      setCommitments((prev) =>
        prev.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                title: editing.title,
                commitment_type: editing.commitment_type as Commitment["commitment_type"],
                start_time: editing.start_time,
                end_time: editing.end_time,
                is_recurring: editing.is_recurring,
                recur_days: editing.is_recurring ? editing.recur_days : [],
                specific_date: editing.is_recurring ? null : editing.specific_date || null,
              }
            : c
        )
      )
      setEditing(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const { error } = await supabase.from("commitments").delete().eq("id", id)
    if (!error) {
      setCommitments((prev) => prev.filter((c) => c.id !== id))
      setConfirmDeleteId(null)
      if (editing?.id === id) setEditing(null)
    }
    setDeleting(false)
  }

  if (commitments.length === 0) return null

  const rosterEntries = commitments.filter((c) => c.roster_week)
  const regularEntries = commitments.filter((c) => !c.roster_week)

  function renderCommitment(c: Commitment) {
    return (
      <div key={c.id}>
        {/* Row */}
        <div className="px-5 py-3.5 flex items-start gap-3">
          <div
            className="w-1 min-h-8 rounded-full flex-shrink-0 self-stretch"
            style={{ backgroundColor: userColour }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-dusk">{c.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {c.start_time.slice(0, 5)} – {c.end_time.slice(0, 5)}
              {" · "}
              {c.roster_week
                ? `This week — ${(c.recur_days ?? []).map((d) => DAY_NAMES_LONG[d].slice(0, 3)).join(", ")}`
                : c.is_recurring
                ? `Every ${c.recur_days?.map((d) => DAY_NAMES_LONG[d].slice(0, 3)).join(", ")}`
                : c.specific_date}
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sand text-dusk capitalize flex-shrink-0">
            {c.commitment_type}
          </span>
          <button
            onClick={() => editing?.id === c.id ? setEditing(null) : startEdit(c)}
            className="text-xs font-semibold text-ocean-mid hover:text-ocean-deep px-2 py-1 rounded-lg hover:bg-sand/50 transition-colors flex-shrink-0"
          >
            {editing?.id === c.id ? "Cancel" : "Edit"}
          </button>
          {confirmDeleteId === c.id ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deleting}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-xs text-muted-foreground hover:text-dusk px-2 py-1 rounded-lg hover:bg-sand/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setConfirmDeleteId(c.id); setEditing(null) }}
              className="text-xs font-semibold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            >
              Delete
            </button>
          )}
        </div>

        {/* Inline edit form */}
        {editing?.id === c.id && (
          <form
            onSubmit={handleSave}
            className="mx-4 mb-4 rounded-xl bg-limestone border border-sand p-4 space-y-3"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">Title</Label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
                className="bg-white border-sand text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">Type</Label>
                <select
                  value={editing.commitment_type}
                  onChange={(e) => setEditing({ ...editing, commitment_type: e.target.value })}
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              {!c.roster_week && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">Schedule</Label>
                  <div className="flex rounded-xl overflow-hidden border border-sand">
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, is_recurring: true })}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${editing.is_recurring ? "bg-ocean-deep text-white" : "bg-white text-dusk"}`}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, is_recurring: false })}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${!editing.is_recurring ? "bg-ocean-deep text-white" : "bg-white text-dusk"}`}
                    >
                      One-off
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">Start</Label>
                <Input
                  type="time"
                  value={editing.start_time}
                  onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                  className="bg-white border-sand"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">End</Label>
                <Input
                  type="time"
                  value={editing.end_time}
                  onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                  className="bg-white border-sand"
                />
              </div>
            </div>

            {!c.roster_week && !editing.is_recurring ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">Date</Label>
                <Input
                  type="date"
                  value={editing.specific_date}
                  onChange={(e) => setEditing({ ...editing, specific_date: e.target.value })}
                  required={!editing.is_recurring}
                  className="bg-white border-sand"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-dusk uppercase tracking-wide">Days</Label>
                <div className="flex gap-1.5">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
                        editing.recur_days.includes(i) ? "text-white" : "bg-white text-muted-foreground hover:bg-sand"
                      }`}
                      style={editing.recur_days.includes(i) ? { backgroundColor: userColour } : {}}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: userColour }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* This week's roster entries */}
      {rosterEntries.length > 0 && (
        <div className="rounded-2xl bg-white border border-ocean-mid/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
            <div>
              <h2
                className="font-semibold text-ocean-deep"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                This Week&apos;s Roster
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Resets automatically next week</p>
            </div>
            <span className="text-xs bg-ocean-mid/10 text-ocean-mid font-semibold px-2 py-1 rounded-full">
              This week only
            </span>
          </div>
          <div className="divide-y divide-sand/50">
            {rosterEntries.map(renderCommitment)}
          </div>
        </div>
      )}

      {/* Regular recurring / one-off commitments */}
      {regularEntries.length > 0 && (
        <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-sand">
            <h2
              className="font-semibold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Regular Commitments
            </h2>
          </div>
          <div className="divide-y divide-sand/50">
            {regularEntries.map(renderCommitment)}
          </div>
        </div>
      )}
    </div>
  )

}
