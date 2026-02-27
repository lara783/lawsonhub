"use client"

import { useState } from "react"
import type { MeetingTopic, Profile } from "@/lib/types"

interface Props {
  currentUserId: string
  currentUserColour: string
  initialTopics: MeetingTopic[]
  profiles: Profile[]
  isAdmin: boolean
}

export function MeetingTopicForm({ currentUserId, currentUserColour, initialTopics, profiles, isAdmin }: Props) {
  const [topics, setTopics] = useState<MeetingTopic[]>(initialTopics)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function profileName(id: string) {
    return profiles.find((p) => p.id === id)?.name ?? "Unknown"
  }
  function profileColour(id: string) {
    return profiles.find((p) => p.id === id)?.colour ?? "#ccc"
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)

    const res = await fetch("/api/meeting/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    const data = await res.json()
    if (res.ok && data.topic) {
      setTopics((prev) => [...prev, data.topic])
      setContent("")
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch("/api/meeting/topics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setTopics((prev) => prev.filter((t) => t.id !== id))
    setDeletingId(null)
  }

  // Group by person
  const grouped: Record<string, MeetingTopic[]> = {}
  for (const t of topics) {
    if (!grouped[t.user_id]) grouped[t.user_id] = []
    grouped[t.user_id].push(t)
  }

  return (
    <div className="space-y-5">
      {/* Add topic form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add something to discuss…"
          maxLength={300}
          className="flex-1 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ocean-mid"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 rounded-xl bg-ocean-mid text-white text-sm font-semibold disabled:opacity-50 hover:bg-ocean-deep transition-colors flex-shrink-0"
        >
          {submitting ? "…" : "Add"}
        </button>
      </form>

      {/* Topics grouped by person */}
      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No topics yet — be the first to add something!
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([userId, userTopics]) => (
            <div key={userId}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: profileColour(userId) }} />
                <span className="text-xs font-semibold text-dusk">{profileName(userId)}</span>
              </div>
              <div className="space-y-1.5 ml-4">
                {userTopics.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 group">
                    <div
                      className="flex-1 rounded-xl bg-limestone border border-sand px-3 py-2 text-sm text-dusk"
                      style={{ borderLeft: `3px solid ${profileColour(userId)}` }}
                    >
                      {t.content}
                    </div>
                    {(userId === currentUserId || isAdmin) && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-muted-foreground hover:text-red-400 transition-colors mt-1.5 opacity-0 group-hover:opacity-100 text-sm leading-none flex-shrink-0"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
