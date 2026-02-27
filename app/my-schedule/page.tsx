export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { CommitmentForm } from "@/components/CommitmentForm"
import { CommitmentList } from "@/components/CommitmentList"
import { format, startOfWeek, getDay } from "date-fns"
import type { Profile, Commitment } from "@/lib/types"

export default async function MySchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: commitments } = await supabase
    .from("commitments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at")

  const typedProfile = profile as Profile
  const today = new Date()
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
  // Only show roster entries for the current week — past roster entries are silently excluded
  const typedCommitments = ((commitments ?? []) as Commitment[]).filter(
    (c) => !c.roster_week || c.roster_week === weekStart
  )

  // Show a nudge on Monday/Tuesday if user is on a rotating roster and hasn't entered shifts yet
  const dow = getDay(today)
  const isEarlyWeek = dow >= 1 && dow <= 2
  const weekStr = format(startOfWeek(today, { weekStartsOn: 1 }), "d MMM")
  const hasRosterThisWeek = typedCommitments.some((c) => c.roster_week === weekStart)
  const isRotatingRoster = typedProfile.is_rotating_roster ?? false

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={typedProfile} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            My Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add your regular commitments — work shifts, sport, activities
          </p>
        </div>

        {isRotatingRoster && isEarlyWeek && !hasRosterThisWeek && (
          <div className="rounded-xl bg-cliff-gold/10 border border-cliff-gold/30 px-4 py-3 text-sm text-dusk">
            <span className="font-semibold">New week — {weekStr}!</span> Add your roster shifts below so jobs are assigned fairly this week.
          </div>
        )}

        <CommitmentForm
          userId={user.id}
          userColour={typedProfile.colour}
          defaultScheduleType={isRotatingRoster ? "roster" : "recurring"}
        />

        <CommitmentList
          initialCommitments={typedCommitments}
          userColour={typedProfile.colour}
          weekStart={weekStart}
        />
      </main>
    </div>
  )
}
