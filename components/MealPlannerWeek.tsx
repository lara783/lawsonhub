"use client"

import { useState } from "react"
import { format, addDays } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { UserAvatar } from "./UserAvatar"
import type { MealPlan, Profile, Recipe } from "@/lib/types"

interface MealPlannerWeekProps {
  weekStart: string
  mealPlan: MealPlan[]
  profiles: Profile[]
  recipes: Recipe[]
  currentUserId: string
  cookByDay?: Record<string, Profile>
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function MealPlannerWeek({
  weekStart,
  mealPlan,
  profiles,
  recipes,
  currentUserId,
  cookByDay = {},
}: MealPlannerWeekProps) {
  const [localPlan, setLocalPlan] = useState<MealPlan[]>(mealPlan)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const supabase = createClient()

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart), i), "yyyy-MM-dd")
  )

  function getMealForDay(dayStr: string) {
    return localPlan.find((m) => m.meal_date === dayStr)
  }

  async function assignMeal(
    dayStr: string,
    recipeId: string | null,
    customName: string,
  ): Promise<void> {
    const existing = getMealForDay(dayStr)
    const assignedCook = cookByDay[dayStr]
    const payload = {
      week_start: weekStart,
      meal_date: dayStr,
      cook_user_id: assignedCook?.id ?? existing?.cook_user_id ?? null,
      recipe_id: recipeId || null,
      custom_meal_name: !recipeId ? customName : null,
    }

    if (existing) {
      const { data, error } = await supabase
        .from("meal_plan")
        .update(payload)
        .eq("id", existing.id)
        .select("*, recipe:recipes(*), cook:profiles(*)")
        .single()
      if (error) throw new Error(error.message)
      if (data) {
        setLocalPlan((prev) => prev.map((m) => (m.meal_date === dayStr ? (data as MealPlan) : m)))
      }
    } else {
      const { data, error } = await supabase
        .from("meal_plan")
        .insert(payload)
        .select("*, recipe:recipes(*), cook:profiles(*)")
        .single()
      if (error) throw new Error(error.message)
      if (data) {
        setLocalPlan((prev) => [...prev, data as MealPlan])
      }
    }
    setEditingDay(null)
  }

  return (
    <div className="space-y-3">
      {weekDays.map((dayStr, i) => {
        const meal = getMealForDay(dayStr)
        const isToday = dayStr === format(new Date(), "yyyy-MM-dd")
        const isEditing = editingDay === dayStr
        // Assigned cook comes from job assignments; fall back to meal record
        const assignedCook = cookByDay[dayStr] ?? meal?.cook ?? null

        return (
          <div
            key={dayStr}
            className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${
              isToday ? "ring-2 ring-seafoam" : "border-sand"
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-12 text-center flex-shrink-0`}>
                <p className={`text-xs font-bold ${isToday ? "text-ocean-mid" : "text-muted-foreground"}`}>
                  {DAY_NAMES[i]}
                </p>
                <p className={`text-lg font-bold ${isToday ? "text-ocean-deep" : "text-dusk"}`}>
                  {format(new Date(dayStr), "d")}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold truncate ${meal?.recipe?.title || meal?.custom_meal_name ? "text-dusk" : "text-muted-foreground italic text-sm font-normal"}`}
                  style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  {meal?.recipe?.title ?? meal?.custom_meal_name ?? "No meal planned"}
                </p>
                {assignedCook && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <UserAvatar
                      name={assignedCook.name}
                      colour={assignedCook.colour}
                      initials={assignedCook.avatar_initials}
                      size="sm"
                    />
                    <span className="text-xs text-muted-foreground">{assignedCook.name} cooking</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setEditingDay(isEditing ? null : dayStr)}
                className="text-xs font-medium text-ocean-mid hover:text-ocean-deep transition-colors px-2 py-1 rounded-lg hover:bg-limestone flex-shrink-0"
              >
                {isEditing ? "Cancel" : meal?.recipe_id || meal?.custom_meal_name ? "Edit" : "+ Plan"}
              </button>
            </div>

            {isEditing && (
              <MealEditForm
                dayStr={dayStr}
                recipes={recipes}
                existing={meal}
                onSave={assignMeal}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function MealEditForm({
  dayStr,
  recipes,
  existing,
  onSave,
}: {
  dayStr: string
  recipes: Recipe[]
  existing?: MealPlan
  onSave: (dayStr: string, recipeId: string | null, customName: string) => Promise<void>
}) {
  const [selectedRecipe, setSelectedRecipe] = useState(existing?.recipe_id ?? "")
  const [customName, setCustomName] = useState(existing?.custom_meal_name ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(dayStr, selectedRecipe || null, customName)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save — please try again")
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-sand px-4 py-4 bg-limestone/40 space-y-3">
      <div>
        <label className="text-xs font-semibold text-dusk uppercase tracking-wide block mb-1.5">
          Recipe
        </label>
        <select
          value={selectedRecipe}
          onChange={(e) => setSelectedRecipe(e.target.value)}
          disabled={saving}
          className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid disabled:opacity-60"
        >
          <option value="">— Custom / TBD —</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>

      {!selectedRecipe && (
        <div>
          <label className="text-xs font-semibold text-dusk uppercase tracking-wide block mb-1.5">
            Meal name
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            disabled={saving}
            placeholder="e.g. BBQ night, Pasta"
            className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid disabled:opacity-60"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "#1B4F72" }}
      >
        {saving ? "Saving…" : "Save Meal"}
      </button>
    </div>
  )
}
