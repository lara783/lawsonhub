export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { AdminPanel } from "@/components/AdminPanel"
import { format, startOfWeek } from "date-fns"
import type { Profile, Task, JobSwapRequest, TaskAssignment, FamilyEvent } from "@/lib/types"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || (profile as Profile).role !== "admin") redirect("/dashboard")

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("name")

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("frequency")
    .order("name")

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  const { data: weekAssignments } = await supabase
    .from("task_assignments")
    .select("*, task:tasks(*), user:profiles(*)")
    .eq("week_start", weekStart)
    .order("assigned_date")

  const { data: swapRequests } = await supabase
    .from("job_swap_requests")
    .select("*, requester_assignment:task_assignments!requester_assignment_id(*, task:tasks(*)), target_assignment:task_assignments!target_assignment_id(*, task:tasks(*))")
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: familyEvents } = await supabase
    .from("family_events")
    .select("*, created_by_profile:profiles(*)")
    .order("event_date")

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Admin Panel ⚙️
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, tasks, and generate weekly schedules
          </p>
        </div>

        <AdminPanel
          profiles={(allProfiles ?? []) as Profile[]}
          tasks={(tasks ?? []) as Task[]}
          swapRequests={(swapRequests ?? []) as JobSwapRequest[]}
          weekAssignments={(weekAssignments ?? []) as TaskAssignment[]}
          weekStart={weekStart}
          familyEvents={(familyEvents ?? []) as FamilyEvent[]}
        />
      </main>
    </div>
  )
}
