export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/Navbar"
import { MealPlannerWeek } from "@/components/MealPlannerWeek"
import { format, startOfWeek } from "date-fns"
import type { Profile, MealPlan, Recipe } from "@/lib/types"

export default async function MealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  const [
    { data: mealPlan },
    { data: allProfiles },
    { data: recipes },
    { data: cookAssignments },
  ] = await Promise.all([
    supabase.from("meal_plan").select("*, recipe:recipes(*), cook:profiles(*)").eq("week_start", weekStart).order("meal_date"),
    supabase.from("profiles").select("*").neq("role", "admin"),
    supabase.from("recipes").select("*").order("title"),
    // Load all cook dinner assignments for this week so we know who cooks each day
    supabase
      .from("task_assignments")
      .select("assigned_date, user_id, task:tasks!inner(name), cook_profile:profiles!user_id(*)")
      .eq("week_start", weekStart)
      .ilike("task.name", "%cook dinner%"),
  ])

  // Build a day → Profile map from job assignments
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
              Meal Planner 🍽️
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Week of {format(new Date(weekStart), "d MMMM yyyy")}
            </p>
          </div>
          <Link
            href="/meals/recipes"
            className="text-sm font-medium text-ocean-mid hover:text-ocean-deep transition-colors bg-white border border-sand px-3 py-2 rounded-xl shadow-sm"
          >
            📖 Recipe Book
          </Link>
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
