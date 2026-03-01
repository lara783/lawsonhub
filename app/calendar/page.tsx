export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { FamilyCalendar } from "@/components/FamilyCalendar"
import type { Profile, Commitment } from "@/lib/types"

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: allProfiles } = await supabase.from("profiles").select("*")
  const { data: commitments } = await supabase.from("commitments").select("*")

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-5xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Family Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone&apos;s commitments in one place
          </p>
        </div>

        <FamilyCalendar
          profiles={allProfiles as Profile[] ?? []}
          commitments={commitments as Commitment[] ?? []}
          currentProfile={profile as Profile}
        />
      </main>
    </div>
  )
}
