import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { requesterAssignmentId, targetAssignmentId } = await req.json()

  // Load both assignments with task scores
  const [reqRes, tgtRes] = await Promise.all([
    supabase.from("task_assignments").select("*, task:tasks(score)").eq("id", requesterAssignmentId).single(),
    supabase.from("task_assignments").select("*, task:tasks(score)").eq("id", targetAssignmentId).single(),
  ])

  if (!reqRes.data || !tgtRes.data) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
  }

  if (reqRes.data.user_id !== user.id) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 })
  }

  // Score range: within ±1 point
  const reqScore = (reqRes.data as any).task?.score ?? 0
  const tgtScore = (tgtRes.data as any).task?.score ?? 0
  if (Math.abs(reqScore - tgtScore) > 1) {
    return NextResponse.json({ error: "Tasks must be within 1 point of each other" }, { status: 400 })
  }

  // Check no existing pending request for the same pair
  const { data: existing } = await supabase
    .from("job_swap_requests")
    .select("id")
    .eq("requester_assignment_id", requesterAssignmentId)
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "You already have a pending swap request for this task" }, { status: 400 })
  }

  const { error } = await supabase.from("job_swap_requests").insert({
    requester_id: user.id,
    requester_assignment_id: requesterAssignmentId,
    target_id: tgtRes.data.user_id,
    target_assignment_id: targetAssignmentId,
    status: "pending",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: "Swap request sent — awaiting admin approval" })
}
