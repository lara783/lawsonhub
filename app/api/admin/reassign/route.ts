import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const { assignmentId, newUserId } = await req.json()

  const { data: assignment } = await supabase
    .from("task_assignments")
    .select("*, task:tasks(score)")
    .eq("id", assignmentId)
    .single()

  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

  const { error } = await supabase
    .from("task_assignments")
    .update({ user_id: newUserId })
    .eq("id", assignmentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: "Reassigned successfully" })
}
