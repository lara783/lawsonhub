export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { format, startOfWeek, addDays } from "date-fns"
import type { Profile, TaskAssignment } from "@/lib/types"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Role order for the fridge sheet: parents first, then older kids, then school kids
const ROLE_ORDER: Record<string, number> = {
  parent: 0,
  admin: 1,
  adult_child: 2,
  school_kid: 3,
}

export default async function PrintRosterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart), i), "yyyy-MM-dd")
  )

  const [{ data: assignments }, { data: profiles }] = await Promise.all([
    supabase
      .from("task_assignments")
      .select("*, task:tasks(*), user:profiles(*)")
      .eq("week_start", weekStart)
      .order("assigned_date"),
    supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .order("name"),
  ])

  const sortedProfiles = [...(profiles ?? [])].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
  )

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Lawson Family Jobs — {format(new Date(weekStart), "d MMMM yyyy")}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Georgia, serif;
            color: #2a2a2a;
            background: white;
            padding: 24px;
            font-size: 13px;
          }
          .header {
            border-bottom: 2px solid #1B4F72;
            padding-bottom: 10px;
            margin-bottom: 20px;
            display: flex;
            align-items: baseline;
            gap: 16px;
          }
          h1 {
            font-size: 20px;
            font-weight: bold;
            color: #1B4F72;
          }
          .week-label {
            font-size: 13px;
            color: #888;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .person-block {
            border: 1px solid #e0d9cc;
            border-radius: 8px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .person-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: bold;
            color: white;
          }
          .colour-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255,255,255,0.6);
            flex-shrink: 0;
          }
          .day-section {
            padding: 4px 12px 6px;
            border-top: 1px solid #f0ece4;
          }
          .day-section:first-of-type { border-top: none; }
          .day-label {
            font-size: 10px;
            font-weight: bold;
            color: #aaa;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 3px;
            margin-top: 4px;
          }
          .task-row {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 2px 0;
          }
          .checkbox {
            width: 13px;
            height: 13px;
            border: 1.5px solid #bbb;
            border-radius: 2px;
            flex-shrink: 0;
          }
          .task-name {
            font-size: 12px;
            color: #333;
            line-height: 1.4;
          }
          .task-label {
            font-size: 10px;
            color: #999;
            font-style: italic;
          }
          .no-tasks {
            font-size: 11px;
            color: #bbb;
            font-style: italic;
            padding: 6px 12px 8px;
          }
          .print-actions {
            position: fixed;
            top: 16px;
            right: 16px;
            display: flex;
            gap: 8px;
          }
          .btn {
            background: #1B4F72;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-family: Georgia, serif;
            text-decoration: none;
            display: inline-block;
          }
          .btn-outline {
            background: white;
            color: #1B4F72;
            border: 1.5px solid #1B4F72;
          }
          @media print {
            .print-actions { display: none; }
            body { padding: 12px; }
            .grid { gap: 12px; }
            @page { size: A4 portrait; margin: 12mm; }
          }
          @media (max-width: 600px) {
            .grid { grid-template-columns: 1fr; }
            .print-actions { position: static; margin-bottom: 16px; }
          }
        `}</style>
      </head>
      <body>
        <div className="print-actions">
          <a href="/jobs" className="btn btn-outline">← Back</a>
          <button className="btn" onClick="window.print()">🖨️ Print / Save PDF</button>
        </div>

        <div className="header">
          <h1>🏠 Lawson Family Jobs</h1>
          <span className="week-label">Week of {format(new Date(weekStart), "d MMMM yyyy")}</span>
        </div>

        <div className="grid">
          {sortedProfiles.map((person: Profile) => {
            const personAssignments = (assignments ?? []).filter(
              (a: TaskAssignment) => a.user_id === person.id
            )

            return (
              <div key={person.id} className="person-block">
                <div
                  className="person-header"
                  style={{ background: person.colour }}
                >
                  <span className="colour-dot" />
                  {person.name}
                </div>

                {personAssignments.length === 0 ? (
                  <p className="no-tasks">No tasks assigned this week</p>
                ) : (
                  weekDays.map((dayStr, i) => {
                    const dayTasks = personAssignments.filter(
                      (a: TaskAssignment) => a.assigned_date === dayStr
                    )
                    if (dayTasks.length === 0) return null
                    return (
                      <div key={dayStr} className="day-section">
                        <p className="day-label">{DAY_NAMES[i]}</p>
                        {dayTasks.map((a: TaskAssignment) => (
                          <div key={a.id} className="task-row">
                            <div className="checkbox" />
                            <span className="task-name">
                              {(a as any).task?.name ?? "Task"}
                              {a.label && (
                                <span className="task-label"> ({a.label})</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </body>
    </html>
  )
}
