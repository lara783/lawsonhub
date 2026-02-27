export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { MeetingTopicForm } from "@/components/MeetingTopicForm"
import Link from "next/link"
import { format, startOfWeek, nextSunday, getDay } from "date-fns"
import type { Profile, MeetingTopic } from "@/lib/types"

export default async function FamilyMeetingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const today = new Date()
  const dow = getDay(today) // 0=Sun, 1=Mon … 6=Sat
  const isSunday = dow === 0

  // Meeting is this Sunday (or today if it is Sunday)
  const meetingSunday = isSunday ? today : nextSunday(today)
  const meetingSundayStr = format(meetingSunday, "d MMMM yyyy")

  // Topics are keyed to the upcoming Monday (week_start)
  const weekStart = format(startOfWeek(
    isSunday ? new Date(today.getTime() + 86400000) : today, // next Monday
    { weekStartsOn: 1 }
  ), "yyyy-MM-dd")

  const { data: allProfiles } = await supabase.from("profiles").select("*").order("name")

  const { data: topics } = await supabase
    .from("meeting_topics")
    .select("*, author:profiles(*)")
    .eq("week_start", weekStart)
    .order("created_at")

  const typedProfile = profile as Profile
  const typedProfiles = (allProfiles ?? []) as Profile[]
  const typedTopics = (topics ?? []) as MeetingTopic[]

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={typedProfile} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Family Meeting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Next meeting: <span className="font-medium text-dusk">{meetingSundayStr}</span>
          </p>
        </div>

        {/* Sunday night schedule prompt */}
        {isSunday && (
          <div className="rounded-xl bg-ocean-deep/10 border border-ocean-mid/30 px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-ocean-deep">
              🗓️ Family meeting tonight — before you wrap up, update your schedule for next week!
            </p>
            <p className="text-xs text-dusk/80">
              If you're on a rotating roster, add your work shifts so jobs get distributed fairly.
            </p>
            <Link
              href="/my-schedule"
              className="inline-block mt-1 px-4 py-2 rounded-xl bg-ocean-mid text-white text-sm font-semibold hover:bg-ocean-deep transition-colors"
            >
              Update My Schedule →
            </Link>
          </div>
        )}

        {/* Agenda topics */}
        <div className="rounded-2xl bg-white border border-sand shadow-sm p-5 space-y-4">
          <div>
            <h2
              className="font-semibold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Meeting Agenda
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add anything you want to bring up at Sunday&apos;s meeting.
            </p>
          </div>

          <MeetingTopicForm
            currentUserId={user.id}
            currentUserColour={typedProfile.colour}
            initialTopics={typedTopics}
            profiles={typedProfiles}
            isAdmin={typedProfile.role === "admin"}
          />
        </div>

        {/* Schedule reminder card */}
        {!isSunday && (
          <div className="rounded-xl bg-limestone border border-sand px-4 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">⏰</span>
            <div>
              <p className="text-sm font-semibold text-dusk">Update your schedule after Sunday&apos;s meeting</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Make sure your work shifts for next week are entered on Sunday night so jobs can be assigned fairly.
              </p>
              <Link href="/my-schedule" className="text-xs font-semibold text-ocean-mid hover:underline mt-1 inline-block">
                Go to My Schedule →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
