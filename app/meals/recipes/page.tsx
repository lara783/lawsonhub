export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/Navbar"
import { RecipeCard } from "@/components/RecipeCard"
import type { Profile, Recipe } from "@/lib/types"

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*), created_by_profile:profiles!created_by(*)")
    .order("title")

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Recipe Book 📖
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {(recipes ?? []).length} recipe{(recipes ?? []).length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/meals/recipes/new"
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm"
            style={{ background: "#1B4F72" }}
          >
            + Add Recipe
          </Link>
        </div>

        {(recipes ?? []).length === 0 ? (
          <div className="rounded-2xl bg-white border border-sand p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">👨‍🍳</div>
            <p
              className="text-lg font-semibold text-dusk"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              No recipes yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first family recipe!
            </p>
            <Link
              href="/meals/recipes/new"
              className="inline-block mt-4 text-sm font-semibold text-ocean-mid hover:text-ocean-deep transition-colors"
            >
              + Add Recipe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(recipes as Recipe[]).map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                currentUserId={user.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
