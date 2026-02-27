import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { colour, avatar_initials, is_rotating_roster } = await request.json()

  if (!colour) return NextResponse.json({ error: "colour is required" }, { status: 400 })

  const updates: Record<string, unknown> = { colour }
  if (avatar_initials) {
    updates.avatar_initials = avatar_initials.slice(0, 2).toUpperCase()
  }
  if (typeof is_rotating_roster === "boolean") {
    updates.is_rotating_roster = is_rotating_roster
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
