"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { FamilyEvent } from "@/lib/types"

interface Props {
  initialEvents: FamilyEvent[]
}

export function FamilyEventsPanel({ initialEvents }: Props) {
  const [events, setEvents] = useState<FamilyEvent[]>(initialEvents)
  const [title, setTitle] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !eventDate) return
    setCreating(true)
    setCreateError(null)

    const res = await fetch("/api/admin/family-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, event_date: eventDate, description }),
    })
    const data = await res.json()
    if (res.ok && data.event) {
      setEvents((prev) => [...prev, data.event].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setTitle("")
      setEventDate("")
      setDescription("")
    } else {
      setCreateError(data.error ?? "Error creating event")
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch("/api/admin/family-events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setDeletingId(null)
  }

  const upcoming = events.filter((e) => e.event_date >= format(new Date(), "yyyy-MM-dd"))
  const past = events.filter((e) => e.event_date < format(new Date(), "yyyy-MM-dd"))

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-dusk mb-1">Create Family Event</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Events show on everyone&apos;s dashboard on the day. Great for movie nights, board games, outings.
        </p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Family Movie Night"
              required
              maxLength={100}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ocean-mid"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              maxLength={200}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ocean-mid"
            />
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !title.trim() || !eventDate}
            className="w-full py-2 rounded-xl bg-ocean-mid text-white text-sm font-semibold disabled:opacity-50 hover:bg-ocean-deep transition-colors"
          >
            {creating ? "Creating…" : "Add Family Event"}
          </button>
        </form>
      </div>

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-dusk uppercase tracking-wide mb-2">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 rounded-xl bg-limestone border border-sand px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dusk">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ev.event_date + "T12:00:00"), "EEEE, d MMMM yyyy")}
                    {ev.description && <span> · {ev.description}</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  disabled={deletingId === ev.id}
                  className="text-muted-foreground hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0 mt-0.5 disabled:opacity-40"
                  title="Delete event"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">No upcoming family events.</p>
      )}

      {past.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium hover:text-dusk">
            Past events ({past.length})
          </summary>
          <div className="mt-2 space-y-1.5 pl-2">
            {past.slice(-5).reverse().map((ev) => (
              <div key={ev.id} className="flex items-center gap-2">
                <span className="text-muted-foreground/60">{format(new Date(ev.event_date + "T12:00:00"), "d MMM")}</span>
                <span className="text-dusk">{ev.title}</span>
                <button
                  onClick={() => handleDelete(ev.id)}
                  disabled={deletingId === ev.id}
                  className="ml-auto text-muted-foreground hover:text-red-400 text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
