import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return { supabase, error: NextResponse.json({ error: "Admin only" }, { status: 403 }) }
  }
  return { supabase, error: null }
}

// POST — create a new task
export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { name, score, frequency, frequency_per_day, estimated_minutes, notes, assigned_roles } = body

  if (!name?.trim() || !score || !frequency) {
    return NextResponse.json({ error: "name, score, and frequency are required" }, { status: 400 })
  }

  const { data, error: dbError } = await supabase
    .from("tasks")
    .insert({
      name: name.trim(),
      score: Number(score),
      frequency,
      frequency_per_day: Number(frequency_per_day) || 1,
      estimated_minutes: estimated_minutes ? Number(estimated_minutes) : null,
      notes: notes?.trim() || null,
      assigned_roles: assigned_roles?.length ? assigned_roles : null,
      is_active: true,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
  return NextResponse.json({ task: data })
}

// PATCH — toggle is_active on a task
export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { id, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error: dbError } = await supabase
    .from("tasks")
    .update({ is_active })
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
