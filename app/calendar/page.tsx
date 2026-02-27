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

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(allProfiles as Profile[] ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-sand text-xs font-medium shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.colour }} />
              {p.name}
            </div>
          ))}
        </div>

        <FamilyCalendar
          profiles={allProfiles as Profile[] ?? []}
          commitments={commitments as Commitment[] ?? []}
        />
      </main>
    </div>
  )
}
