export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { RecipeForm } from "@/components/RecipeForm"
import type { Profile } from "@/lib/types"

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*)")
    .eq("id", id)
    .single()

  if (!recipe) redirect("/meals/recipes")

  const typedProfile = profile as Profile

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={typedProfile} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Edit Recipe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{recipe.title}</p>
        </div>
        <RecipeForm
          userId={user.id}
          userColour={typedProfile.colour}
          existingRecipe={{
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            instructions: recipe.instructions,
            photo_url: recipe.photo_url,
            ingredients: recipe.ingredients ?? [],
          }}
        />
      </main>
    </div>
  )
}
