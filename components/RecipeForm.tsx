"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface RecipeFormProps {
  userId: string
  userColour: string
  existingRecipe?: {
    id: string
    title: string
    description: string | null
    instructions: string | null
    photo_url: string | null
    ingredients: { id: string; name: string; quantity: string | null }[]
  }
}

interface Ingredient {
  name: string
  quantity: string
}

export function RecipeForm({ userId, userColour, existingRecipe }: RecipeFormProps) {
  const [title, setTitle] = useState(existingRecipe?.title ?? "")
  const [description, setDescription] = useState(existingRecipe?.description ?? "")
  const [instructions, setInstructions] = useState(existingRecipe?.instructions ?? "")
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    existingRecipe?.ingredients?.map((i) => ({ name: i.name, quantity: i.quantity ?? "" })) ?? [
      { name: "", quantity: "" },
    ]
  )
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingRecipe?.photo_url ?? null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "", quantity: "" }])
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: "name" | "quantity", value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let photoUrl: string | null = existingRecipe?.photo_url ?? null

    // Upload photo if selected
    if (photoFile) {
      const ext = photoFile.name.split(".").pop()
      const path = `recipes/${userId}-${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage
        .from("recipe-photos")
        .upload(path, photoFile, { upsert: true })

      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("recipe-photos")
          .getPublicUrl(uploadData.path)
        photoUrl = urlData.publicUrl
      }
    }

    const validIngredients = ingredients.filter((i) => i.name.trim())

    if (existingRecipe) {
      // Update existing recipe
      await supabase
        .from("recipes")
        .update({ title, description: description || null, instructions: instructions || null, photo_url: photoUrl, updated_at: new Date().toISOString() })
        .eq("id", existingRecipe.id)

      await supabase.from("recipe_ingredients").delete().eq("recipe_id", existingRecipe.id)
      if (validIngredients.length > 0) {
        await supabase.from("recipe_ingredients").insert(
          validIngredients.map((ing, i) => ({
            recipe_id: existingRecipe.id,
            name: ing.name.trim(),
            quantity: ing.quantity.trim() || null,
            sort_order: i,
          }))
        )
      }
      router.push(`/meals/recipes/${existingRecipe.id}`)
    } else {
      // Create new recipe
      const { data: recipe } = await supabase
        .from("recipes")
        .insert({ title, description: description || null, instructions: instructions || null, photo_url: photoUrl, created_by: userId })
        .select()
        .single()

      if (recipe && validIngredients.length > 0) {
        await supabase.from("recipe_ingredients").insert(
          validIngredients.map((ing, i) => ({
            recipe_id: recipe.id,
            name: ing.name.trim(),
            quantity: ing.quantity.trim() || null,
            sort_order: i,
          }))
        )
      }
      router.push(`/meals/recipes/${recipe?.id ?? ""}`)
    }

    router.refresh()
    setLoading(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      style={{ borderLeft: `4px solid ${userColour}` }}
    >
      <div className="rounded-2xl bg-white border border-sand shadow-sm p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Recipe Name</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mum's Spaghetti Bolognese"
            required
            className="bg-limestone border-sand"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Short description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A quick description…"
            className="bg-limestone border-sand"
          />
        </div>

        {/* Photo upload */}
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Photo (optional)</Label>
          {photoPreview && (
            <div className="h-40 rounded-xl overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sand file:text-dusk hover:file:bg-mist cursor-pointer"
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="rounded-2xl bg-white border border-sand shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3
            className="font-semibold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Ingredients
          </h3>
          <button
            type="button"
            onClick={addIngredient}
            className="text-xs font-semibold text-ocean-mid hover:text-ocean-deep transition-colors"
          >
            + Add
          </button>
        </div>

        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={ing.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                placeholder="Ingredient"
                className="flex-1 bg-limestone border-sand text-sm"
              />
              <Input
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                placeholder="Amount"
                className="w-24 bg-limestone border-sand text-sm"
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="text-muted-foreground hover:text-red-500 text-sm transition-colors w-6 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl bg-white border border-sand shadow-sm p-5 space-y-2">
        <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">
          How to make it
        </Label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Write the steps here… e.g.&#10;1. Brown the mince&#10;2. Add tomatoes&#10;3. Simmer for 20 mins"
          rows={8}
          className="bg-limestone border-sand text-sm resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-2xl text-base font-semibold"
        style={{ background: userColour, color: "white" }}
      >
        {loading ? "Saving…" : existingRecipe ? "Save Changes" : "Add Recipe"}
      </Button>
    </form>
  )
}
