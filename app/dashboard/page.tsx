export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { DashboardCard } from "@/components/DashboardCard"
import Link from "next/link"
import { format, getDay } from "date-fns"
import type { Profile, TaskAssignment, MealPlan, FamilyEvent } from "@/lib/types"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  const today = format(new Date(), "yyyy-MM-dd")
  const isSunday = getDay(new Date()) === 0

  // Fetch today's task assignments with task details
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("*, task:tasks(*)")
    .eq("user_id", user.id)
    .eq("assigned_date", today)
    .order("completed", { ascending: true })

  // Fetch tonight's meal plan
  const { data: tonightsMeal } = await supabase
    .from("meal_plan")
    .select("*, recipe:recipes(*), cook:profiles(*)")
    .eq("meal_date", today)
    .maybeSingle()

  // Fetch today's family events
  const { data: todaysEvents } = await supabase
    .from("family_events")
    .select("*")
    .eq("event_date", today)
    .order("created_at")

  const typedProfile = profile as Profile
  const typedAssignments = (assignments ?? []) as TaskAssignment[]
  const typedEvents = (todaysEvents ?? []) as FamilyEvent[]

  const totalScore = typedAssignments.reduce((sum, a) => sum + (a.task?.score ?? 0), 0)
  const completedScore = typedAssignments
    .filter((a) => a.completed)
    .reduce((sum, a) => sum + (a.task?.score ?? 0), 0)

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={typedProfile} />

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Greeting header */}
        <div
          className="rounded-3xl p-6 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${typedProfile.colour} 0%, ${typedProfile.colour}CC 100%)`,
          }}
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 translate-x-8 -translate-y-8"
            style={{ background: "white" }}
          />
          <p className="text-sm opacity-80 font-medium">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
          <h1
            className="text-2xl font-bold mt-1"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            {getGreeting()}, {typedProfile.name} 🌊
          </h1>
          {totalScore > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="opacity-80">Today&apos;s progress</span>
                <span className="font-bold">
                  {completedScore} / {totalScore} pts
                </span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: totalScore > 0 ? `${(completedScore / totalScore) * 100}%` : "0%",
                    background: "rgba(255,255,255,0.9)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sunday night prompt */}
        {isSunday && (
          <div className="rounded-xl bg-ocean-deep/10 border border-ocean-mid/30 px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-ocean-deep">
              🗓️ Family meeting tonight — add your schedule for next week!
            </p>
            <p className="text-xs text-dusk/80">
              Update your work shifts so jobs get distributed fairly. Add anything to discuss at the meeting too.
            </p>
            <div className="flex gap-2 mt-1">
              <Link
                href="/my-schedule"
                className="px-3 py-1.5 rounded-xl bg-ocean-mid text-white text-xs font-semibold hover:bg-ocean-deep transition-colors"
              >
                Update Schedule
              </Link>
              <Link
                href="/family-meeting"
                className="px-3 py-1.5 rounded-xl border border-ocean-mid text-ocean-mid text-xs font-semibold hover:bg-ocean-mid/10 transition-colors"
              >
                Family Meeting
              </Link>
            </div>
          </div>
        )}

        {/* Today's family events */}
        {typedEvents.length > 0 && (
          <div className="rounded-2xl bg-white border border-sand p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Today&apos;s Family Plans 🎉
            </p>
            {typedEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-2">
                <span className="text-lg">🏡</span>
                <div>
                  <p className="text-sm font-semibold text-dusk">{ev.title}</p>
                  {ev.description && (
                    <p className="text-xs text-muted-foreground">{ev.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today's tasks */}
        <DashboardCard
          assignments={typedAssignments}
          userId={user.id}
        />

        {/* Tonight's dinner */}
        {tonightsMeal && (
          <div className="rounded-2xl bg-white border border-sand p-5 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Tonight&apos;s Dinner 🍽️
            </p>
            <p
              className="text-lg font-semibold text-dusk"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {(tonightsMeal as MealPlan).recipe?.title ??
                (tonightsMeal as MealPlan).custom_meal_name ??
                "TBD"}
            </p>
            {(tonightsMeal as MealPlan).cook && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Cooking: {(tonightsMeal as MealPlan).cook?.name}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {typedAssignments.length === 0 && (
          <div className="rounded-2xl bg-white border border-sand p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🌿</div>
            <p
              className="text-lg font-semibold text-dusk"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              No jobs assigned yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The admin will generate this week&apos;s schedule soon.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
