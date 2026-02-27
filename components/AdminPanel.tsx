"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserAvatar } from "./UserAvatar"
import { ScoreBadge } from "./ScoreBadge"
import { AdminSwapsTab } from "./AdminSwapsTab"
import { FamilyEventsPanel } from "./FamilyEventsPanel"
import { format, startOfWeek } from "date-fns"
import type { Profile, Task, JobSwapRequest, TaskAssignment, FamilyEvent } from "@/lib/types"

interface AdminPanelProps {
  profiles: Profile[]
  tasks: Task[]
  swapRequests?: JobSwapRequest[]
  weekAssignments?: TaskAssignment[]
  weekStart?: string
  familyEvents?: FamilyEvent[]
}

type Tab = "users" | "tasks" | "schedule" | "swaps"

interface EditState {
  id: string
  name: string
  role: string
  colour: string
  newPassword: string
}

const ROLE_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "adult_child", label: "Adult child" },
  { value: "school_kid", label: "School kid" },
  { value: "admin", label: "Admin" },
]

const COLOUR_OPTIONS = [
  { label: "Ocean Deep",  value: "#1B4F72" },
  { label: "Rainforest",  value: "#2D6A4F" },
  { label: "Ocean Mid",   value: "#2E86AB" },
  { label: "Fern",        value: "#52B788" },
  { label: "Cliff Gold",  value: "#C9A84C" },
  { label: "Seafoam",     value: "#5DA2A8" },
  { label: "Dusk",        value: "#4A3728" },
  { label: "Mist",        value: "#B7C9D3" },
]

const FREQUENCY_OPTIONS = ["daily", "weekly", "fortnightly", "monthly"]

export function AdminPanel({ profiles: initialProfiles, tasks: initialTasks, swapRequests = [], weekAssignments = [], weekStart = "", familyEvents = [] }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>("schedule")
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  // New task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskName, setTaskName] = useState("")
  const [taskScore, setTaskScore] = useState("3")
  const [taskFrequency, setTaskFrequency] = useState("daily")
  const [taskFreqPerDay, setTaskFreqPerDay] = useState("1")
  const [taskMins, setTaskMins] = useState("")
  const [taskNotes, setTaskNotes] = useState("")
  const [taskSaving, setTaskSaving] = useState(false)
  const [taskResult, setTaskResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Schedule
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("adult_child")
  const [newColour, setNewColour] = useState("#2E86AB")
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Edit profile
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [editResult, setEditResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Delete user
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const router = useRouter()

  async function generateWeek() {
    setGenerating(true)
    setGenResult(null)
    const res = await fetch("/api/admin/generate-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    const json = await res.json()
    setGenResult(json.message ?? (json.error ? `Error: ${json.error}` : "Done!"))
    setGenerating(false)
    router.refresh()
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateResult(null)

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        name: newName,
        role: newRole,
        colour: newColour,
      }),
    })
    const json = await res.json()

    if (json.error) {
      setCreateResult({ ok: false, msg: json.error })
    } else {
      setCreateResult({ ok: true, msg: `✓ ${newName} has been added!` })
      setProfiles((prev) => [
        ...prev,
        {
          id: json.userId,
          name: newName,
          role: newRole as Profile["role"],
          colour: newColour,
          avatar_initials: newName.slice(0, 2).toUpperCase(),
        },
      ])
      setNewName("")
      setNewEmail("")
      setNewPassword("")
      setNewRole("adult_child")
      setNewColour("#2E86AB")
      setShowCreateForm(false)
    }
    setCreating(false)
  }

  function startEdit(p: Profile) {
    setEditing({ id: p.id, name: p.name, role: p.role, colour: p.colour, newPassword: "" })
    setEditResult(null)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setEditResult(null)

    // Update profile details
    const profileRes = await fetch("/api/admin/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, name: editing.name, role: editing.role, colour: editing.colour }),
    })
    const profileJson = await profileRes.json()

    if (profileJson.error) {
      setEditResult({ ok: false, msg: profileJson.error })
      setSaving(false)
      return
    }

    // Update password if provided
    if (editing.newPassword) {
      const pwRes = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, password: editing.newPassword }),
      })
      const pwJson = await pwRes.json()
      if (pwJson.error) {
        setEditResult({ ok: false, msg: `Profile saved but password error: ${pwJson.error}` })
        setSaving(false)
        return
      }
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === editing.id
          ? {
              ...p,
              name: editing.name,
              role: editing.role as Profile["role"],
              colour: editing.colour,
              avatar_initials: editing.name.slice(0, 2).toUpperCase(),
            }
          : p
      )
    )
    setEditing(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (!json.error) {
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      setConfirmDeleteId(null)
      if (editing?.id === id) setEditing(null)
    }
    setDeleting(false)
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    setTaskSaving(true)
    setTaskResult(null)
    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: taskName,
        score: taskScore,
        frequency: taskFrequency,
        frequency_per_day: taskFreqPerDay,
        estimated_minutes: taskMins || null,
        notes: taskNotes || null,
      }),
    })
    const json = await res.json()
    if (json.error) {
      setTaskResult({ ok: false, msg: json.error })
    } else {
      setTasks((prev) => [...prev, json.task])
      setTaskResult({ ok: true, msg: `✓ "${json.task.name}" added!` })
      setTaskName(""); setTaskScore("3"); setTaskFrequency("daily")
      setTaskFreqPerDay("1"); setTaskMins(""); setTaskNotes("")
      setShowTaskForm(false)
    }
    setTaskSaving(false)
  }

  async function handleToggleTask(id: string, current: boolean) {
    const res = await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    })
    if (res.ok) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !current } : t))
    }
  }

  const pendingSwaps = swapRequests.filter((r) => r.status === "pending").length

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "schedule", label: "Schedule", icon: "📅" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "tasks", label: "Tasks", icon: "✅" },
    { id: "swaps", label: "Swaps", icon: "⇄", badge: pendingSwaps },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-sand rounded-2xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              tab === t.id
                ? "bg-white text-ocean-deep shadow-sm"
                : "text-dusk hover:text-ocean-deep"
            }`}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span className="ml-0.5 px-1.5 py-0.5 bg-cliff-gold text-white rounded-full text-[10px] leading-none font-bold">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Schedule tab */}
      {tab === "schedule" && (
        <div className="rounded-2xl bg-white border border-sand shadow-sm p-6 space-y-4">
          <h2
            className="font-semibold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Generate Weekly Schedule
          </h2>
          <p className="text-sm text-muted-foreground">
            This will create task assignments for all family members for the current week,
            based on their commitments and the fair distribution algorithm.
            Any existing assignments for this week will be replaced.
          </p>
          <div className="bg-limestone rounded-xl p-3 text-sm">
            <span className="font-medium text-dusk">Week: </span>
            <span className="text-muted-foreground">
              {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMMM yyyy")}
            </span>
          </div>

          <button
            onClick={generateWeek}
            disabled={generating}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "#1B4F72" }}
          >
            {generating ? "⏳ Generating…" : "🔄 Generate This Week's Jobs"}
          </button>

          {genResult && (
            <div
              className={`rounded-xl p-3 text-sm font-medium ${
                genResult.startsWith("Error")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-fern/10 text-rainforest border border-fern/30"
              }`}
            >
              {genResult}
            </div>
          )}

          <div className="border-t border-sand pt-4">
            <h2
              className="font-semibold text-ocean-deep mb-1"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Family Events
            </h2>
            <FamilyEventsPanel initialEvents={familyEvents} />
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
              <h2
                className="font-semibold text-ocean-deep"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Family Members ({profiles.length})
              </h2>
              <button
                onClick={() => { setShowCreateForm((v) => !v); setCreateResult(null); setEditing(null) }}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: "#1B4F72" }}
              >
                {showCreateForm ? "Cancel" : "+ Add Member"}
              </button>
            </div>

            <div className="divide-y divide-sand/50">
              {profiles.map((p) => (
                <div key={p.id}>
                  {/* Profile row */}
                  <div className="px-5 py-3.5 flex items-center gap-3">
                    <UserAvatar name={p.name} colour={p.colour} initials={p.avatar_initials} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-dusk">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.role.replace("_", " ")}</p>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.colour }}
                    />
                    <button
                      onClick={() => editing?.id === p.id ? setEditing(null) : startEdit(p)}
                      className="text-xs font-semibold text-ocean-mid hover:text-ocean-deep px-2 py-1 rounded-lg hover:bg-sand/50 transition-colors"
                    >
                      {editing?.id === p.id ? "Cancel" : "Edit"}
                    </button>
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(p.id)}
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
                        onClick={() => { setConfirmDeleteId(p.id); setEditing(null) }}
                        className="text-xs font-semibold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Inline edit form */}
                  {editing?.id === p.id && (
                    <form
                      onSubmit={handleSaveEdit}
                      className="mx-4 mb-4 rounded-xl bg-limestone border border-sand p-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Name</label>
                          <input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            required
                            className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Role</label>
                          <select
                            value={editing.role}
                            onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                            className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Colour</label>
                        <div className="flex flex-wrap gap-2">
                          {COLOUR_OPTIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditing({ ...editing, colour: c.value })}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${
                                editing.colour === c.value ? "border-dusk scale-110" : "border-transparent"
                              }`}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">
                          New Password <span className="text-muted-foreground normal-case font-normal">(leave blank to keep current)</span>
                        </label>
                        <input
                          type="password"
                          value={editing.newPassword}
                          onChange={(e) => setEditing({ ...editing, newPassword: e.target.value })}
                          placeholder="Min. 6 characters"
                          minLength={6}
                          className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                        />
                      </div>

                      {editResult && (
                        <p className={`text-xs font-medium ${editResult.ok ? "text-rainforest" : "text-red-600"}`}>
                          {editResult.msg}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        style={{ background: editing.colour }}
                      >
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create user form */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateUser}
              className="rounded-2xl bg-white border border-ocean-mid shadow-sm p-5 space-y-4"
            >
              <h3
                className="font-semibold text-ocean-deep"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Add Family Member
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ollie"
                    required
                    className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Colour</label>
                <div className="flex flex-wrap gap-2">
                  {COLOUR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColour(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newColour === c.value ? "border-dusk scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {createResult && (
                <div
                  className={`rounded-xl p-3 text-sm font-medium ${
                    createResult.ok
                      ? "bg-fern/10 text-rainforest border border-fern/30"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {createResult.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: newColour }}
              >
                {creating ? "Creating…" : `Add ${newName || "Member"}`}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tasks tab */}
      {tab === "tasks" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
              <h2
                className="font-semibold text-ocean-deep"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Task Library ({tasks.filter((t) => t.is_active).length} active)
              </h2>
              <button
                onClick={() => { setShowTaskForm((v) => !v); setTaskResult(null) }}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: "#1B4F72" }}
              >
                {showTaskForm ? "Cancel" : "+ Add Task"}
              </button>
            </div>
            <div className="divide-y divide-sand/50">
              {tasks.map((task) => (
                <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.is_active ? "text-dusk" : "text-muted-foreground line-through"}`}>
                      {task.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {task.frequency}{task.frequency_per_day > 1 ? ` ×${task.frequency_per_day}` : ""}
                      {task.estimated_minutes ? ` · ~${task.estimated_minutes} min` : ""}
                    </p>
                  </div>
                  <ScoreBadge score={task.score} />
                  <button
                    onClick={() => handleToggleTask(task.id, task.is_active)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      task.is_active
                        ? "bg-sand text-dusk hover:bg-red-50 hover:text-red-600"
                        : "bg-fern/10 text-rainforest hover:bg-fern/20"
                    }`}
                  >
                    {task.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* New task form */}
          {showTaskForm && (
            <form
              onSubmit={handleCreateTask}
              className="rounded-2xl bg-white border border-ocean-mid shadow-sm p-5 space-y-4"
            >
              <h3
                className="font-semibold text-ocean-deep"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Add New Task
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Task Name</label>
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. Clean back deck"
                  required
                  className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Score (1–10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={taskScore}
                    onChange={(e) => setTaskScore(e.target.value)}
                    required
                    className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Frequency</label>
                  <select
                    value={taskFrequency}
                    onChange={(e) => setTaskFrequency(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f} className="capitalize">{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Times per day</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={taskFreqPerDay}
                    onChange={(e) => setTaskFreqPerDay(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Est. minutes</label>
                  <input
                    type="number"
                    min={1}
                    value={taskMins}
                    onChange={(e) => setTaskMins(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dusk uppercase tracking-wide block">Notes <span className="font-normal text-muted-foreground normal-case">(optional)</span></label>
                <input
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Any special instructions"
                  className="w-full rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
                />
              </div>

              {taskResult && (
                <div className={`rounded-xl p-3 text-sm font-medium ${taskResult.ok ? "bg-fern/10 text-rainforest border border-fern/30" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {taskResult.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={taskSaving}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "#1B4F72" }}
              >
                {taskSaving ? "Saving…" : "Add Task to Library"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Swaps tab */}
      {tab === "swaps" && (
        <div className="rounded-2xl bg-white border border-sand shadow-sm p-5">
          <h2
            className="font-semibold text-ocean-deep mb-4"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Job Swaps
          </h2>
          <AdminSwapsTab
            swapRequests={swapRequests}
            profiles={profiles}
            assignments={weekAssignments}
            weekStart={weekStart}
          />
        </div>
      )}
    </div>
  )
}
