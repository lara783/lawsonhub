export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/Navbar"
import { WeekJobBoard } from "@/components/WeekJobBoard"
import { format, startOfWeek } from "date-fns"
import type { Profile, TaskAssignment, JobSwapRequest } from "@/lib/types"

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("name")

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("*, task:tasks(*), user:profiles(*)")
    .eq("week_start", weekStart)
    .order("assigned_date")

  const { data: swapRequests } = await supabase
    .from("job_swap_requests")
    .select("*, requester_assignment:task_assignments!requester_assignment_id(*, task:tasks(*)), target_assignment:task_assignments!target_assignment_id(*, task:tasks(*))")
    .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
    .eq("status", "pending")

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-6xl mx-auto px-4 pt-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              This Week&apos;s Jobs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Week of {format(new Date(weekStart), "d MMMM yyyy")}
            </p>
          </div>
          <Link
            href="/jobs/print"
            target="_blank"
            className="text-sm font-medium text-ocean-mid hover:text-ocean-deep transition-colors bg-white border border-sand px-3 py-2 rounded-xl shadow-sm flex-shrink-0"
          >
            🖨️ Print Roster
          </Link>
        </div>

        <WeekJobBoard
          profiles={allProfiles as Profile[] ?? []}
          assignments={assignments as TaskAssignment[] ?? []}
          currentUserId={user.id}
          weekStart={weekStart}
          swapRequests={swapRequests as JobSwapRequest[] ?? []}
        />
      </main>
    </div>
  )
}
