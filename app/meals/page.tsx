export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/Navbar"
import { MealPlannerWeek } from "@/components/MealPlannerWeek"
import { format, startOfWeek, addWeeks, subWeeks, parseISO, addDays, isSameWeek } from "date-fns"
import type { Profile, MealPlan, Recipe } from "@/lib/types"

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { week: weekParam } = await searchParams
  const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const selectedWeekStart = weekParam
    ? startOfWeek(parseISO(weekParam), { weekStartsOn: 1 })
    : todayWeekStart
  const weekStart = format(selectedWeekStart, "yyyy-MM-dd")
  const isCurrentWeek = isSameWeek(selectedWeekStart, todayWeekStart, { weekStartsOn: 1 })

  const prevWeek = format(subWeeks(selectedWeekStart, 1), "yyyy-MM-dd")
  const nextWeek = format(addWeeks(selectedWeekStart, 1), "yyyy-MM-dd")

  const [
    { data: mealPlan },
    { data: allProfiles },
    { data: recipes },
    { data: cookAssignments },
  ] = await Promise.all([
    supabase.from("meal_plan").select("*, recipe:recipes(*), cook:profiles(*)").eq("week_start", weekStart).order("meal_date"),
    supabase.from("profiles").select("*").neq("role", "admin"),
    supabase.from("recipes").select("*").order("title"),
    supabase
      .from("task_assignments")
      .select("assigned_date, user_id, task:tasks!inner(name), cook_profile:profiles!user_id(*)")
      .eq("week_start", weekStart)
      .ilike("task.name", "%cook dinner%"),
  ])

  type CookMap = Record<string, Profile>
  const cookByDay: CookMap = {}
  for (const a of cookAssignments ?? []) {
    const raw = (a as unknown as { cook_profile: Profile | Profile[] }).cook_profile
    const p = Array.isArray(raw) ? raw[0] : raw
    if (p) cookByDay[a.assigned_date] = p
  }

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {isCurrentWeek ? "Meal Planner 🍽️" : "Meal Planner 🍽️"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(selectedWeekStart, "d MMM")} – {format(addDays(selectedWeekStart, 6), "d MMM yyyy")}
            </p>
          </div>
          <Link
            href="/meals/recipes"
            className="text-sm font-medium text-ocean-mid hover:text-ocean-deep transition-colors bg-white border border-sand px-3 py-2 rounded-xl shadow-sm"
          >
            📖 Recipe Book
          </Link>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <Link
            href={`/meals?week=${prevWeek}`}
            className="p-2 rounded-xl bg-white border border-sand hover:bg-limestone transition-colors text-dusk font-bold shadow-sm"
          >
            ←
          </Link>
          <span className="flex-1 text-center text-sm font-semibold text-ocean-deep bg-white border border-sand rounded-xl px-4 py-2 shadow-sm">
            {format(selectedWeekStart, "d MMM")} – {format(addDays(selectedWeekStart, 6), "d MMM yyyy")}
          </span>
          <Link
            href={`/meals?week=${nextWeek}`}
            className="p-2 rounded-xl bg-white border border-sand hover:bg-limestone transition-colors text-dusk font-bold shadow-sm"
          >
            →
          </Link>
          {!isCurrentWeek && (
            <Link
              href="/meals"
              className="text-xs font-semibold text-ocean-mid hover:text-ocean-deep bg-white border border-sand px-3 py-2 rounded-xl shadow-sm transition-colors"
            >
              Today
            </Link>
          )}
        </div>

        <MealPlannerWeek
          weekStart={weekStart}
          mealPlan={(mealPlan ?? []) as MealPlan[]}
          profiles={(allProfiles ?? []) as Profile[]}
          recipes={(recipes ?? []) as Recipe[]}
          currentUserId={user.id}
          cookByDay={cookByDay}
        />
      </main>
    </div>
  )
}
