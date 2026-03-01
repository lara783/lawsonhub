export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/Navbar"
import { AddToGroceriesButton } from "@/components/AddToGroceriesButton"
import { format, startOfWeek } from "date-fns"
import type { Profile, Recipe } from "@/lib/types"

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*), created_by_profile:profiles!created_by(*)")
    .eq("id", params.id)
    .single()

  if (!recipe) redirect("/meals/recipes")

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  // Get current grocery list id
  const { data: groceryList } = await supabase
    .from("grocery_lists")
    .select("id, shopping_done")
    .eq("week_start", weekStart)
    .maybeSingle()

  const typedProfile = profile as Profile
  const typedRecipe = recipe as Recipe
  const canEdit =
    typedProfile.role === "admin" || typedRecipe.created_by === user.id

  const sortedIngredients = (typedRecipe.ingredients ?? []).sort(
    (a, b) => a.sort_order - b.sort_order
  )

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={typedProfile} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Hero */}
        {typedRecipe.photo_url ? (
          <div className="rounded-3xl overflow-hidden h-56">
            <img
              src={typedRecipe.photo_url}
              alt={typedRecipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="rounded-3xl h-40 flex items-center justify-center text-6xl"
            style={{ background: "linear-gradient(135deg, #A8DADC, #E8DCC8)" }}
          >
            🍽️
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {typedRecipe.title}
            </h1>
            {typedRecipe.description && (
              <p className="text-sm text-muted-foreground mt-1">{typedRecipe.description}</p>
            )}
            {typedRecipe.created_by_profile && (
              <p className="text-xs text-muted-foreground mt-1">
                Added by {(typedRecipe.created_by_profile as Profile).name}
              </p>
            )}
          </div>

          {canEdit && (
            <Link
              href={`/meals/recipes/${typedRecipe.id}/edit`}
              className="text-xs font-medium text-ocean-mid hover:text-ocean-deep transition-colors bg-white border border-sand px-3 py-1.5 rounded-xl shadow-sm flex-shrink-0"
            >
              Edit
            </Link>
          )}
        </div>

        {/* Ingredients */}
        {sortedIngredients.length > 0 && (
          <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
              <h2
                className="font-semibold text-ocean-deep"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Ingredients ({sortedIngredients.length})
              </h2>
              {groceryList && !groceryList.shopping_done && (
                <AddToGroceriesButton
                  listId={groceryList.id}
                  ingredients={sortedIngredients}
                  recipeId={typedRecipe.id}
                  userId={user.id}
                />
              )}
            </div>
            <div className="divide-y divide-sand/40">
              {sortedIngredients.map((ing) => (
                <div key={ing.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-dusk">{ing.name}</span>
                  {ing.quantity && (
                    <span className="text-sm text-muted-foreground">{ing.quantity}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {typedRecipe.instructions && (
          <div className="rounded-2xl bg-white border border-sand shadow-sm p-5">
            <h2
              className="font-semibold text-ocean-deep mb-3"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Recipe
            </h2>
            <div className="text-sm text-dusk whitespace-pre-wrap leading-relaxed">
              {typedRecipe.instructions}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
