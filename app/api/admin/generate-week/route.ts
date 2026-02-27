import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { format, startOfWeek } from "date-fns"
import { generateWeeklyAssignments } from "@/lib/taskDistribution"
import type { Profile, Commitment, Task } from "@/lib/types"

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekStr = format(weekStart, "yyyy-MM-dd")

  // Load data
  const [profilesRes, commitmentsRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("commitments").select("*"),
    supabase.from("tasks").select("*").eq("is_active", true),
  ])

  const profiles = (profilesRes.data ?? []) as Profile[]
  const commitments = (commitmentsRes.data ?? []) as Commitment[]
  const tasks = (tasksRes.data ?? []) as Task[]

  // Clean up past one-off commitments so rotating-roster workers re-enter each week
  await supabase
    .from("commitments")
    .delete()
    .eq("is_recurring", false)
    .lt("specific_date", weekStr)

  // Delete existing assignments for this week
  await supabase.from("task_assignments").delete().eq("week_start", weekStr)

  // Generate new assignments
  const assignments = generateWeeklyAssignments(weekStart, profiles, commitments, tasks)

  if (assignments.length === 0) {
    return NextResponse.json({ message: "No assignments generated — make sure tasks and profiles exist." })
  }

  const { error } = await supabase.from("task_assignments").insert(assignments)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `✓ Generated ${assignments.length} assignments for the week of ${weekStr}`,
  })
}
