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

  const { swapId, action } = await req.json() // action: "approve" | "reject"

  const { data: swap } = await supabase
    .from("job_swap_requests")
    .select("*")
    .eq("id", swapId)
    .single()

  if (!swap) return NextResponse.json({ error: "Swap not found" }, { status: 404 })
  if (swap.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 400 })

  if (action === "approve") {
    const [reqAssign, tgtAssign] = await Promise.all([
      supabase.from("task_assignments").select("user_id").eq("id", swap.requester_assignment_id).single(),
      supabase.from("task_assignments").select("user_id").eq("id", swap.target_assignment_id).single(),
    ])

    if (!reqAssign.data || !tgtAssign.data) {
      return NextResponse.json({ error: "Assignments not found" }, { status: 404 })
    }

    // Swap the user_ids on both assignments
    await Promise.all([
      supabase.from("task_assignments").update({ user_id: tgtAssign.data.user_id }).eq("id", swap.requester_assignment_id),
      supabase.from("task_assignments").update({ user_id: reqAssign.data.user_id }).eq("id", swap.target_assignment_id),
    ])
  }

  await supabase.from("job_swap_requests").update({
    status: action === "approve" ? "approved" : "rejected",
    resolved_at: new Date().toISOString(),
    resolved_by: user.id,
  }).eq("id", swapId)

  return NextResponse.json({ message: `Swap ${action}d` })
}
