export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { RecipeForm } from "@/components/RecipeForm"
import type { Profile } from "@/lib/types"

export default async function NewRecipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            New Recipe 👨‍🍳
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share a family favourite
          </p>
        </div>
        <RecipeForm userId={user.id} userColour={(profile as Profile).colour} />
      </main>
    </div>
  )
}
