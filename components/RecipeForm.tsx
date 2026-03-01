"use client"

import { useState, useEffect, useCallback } from "react"
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

export function RecipeForm({ userId, userColour, existingRecipe }: RecipeFormProps) {
  const [title, setTitle] = useState(existingRecipe?.title ?? "")
  const [description, setDescription] = useState(existingRecipe?.description ?? "")
  const [recipeText, setRecipeText] = useState(existingRecipe?.instructions ?? "")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingRecipe?.photo_url ?? null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile()
        if (blob) {
          const ext = blob.type.split("/")[1] || "png"
          const file = new File([blob], `pasted-image.${ext}`, { type: blob.type })
          setPhotoFile(file)
          setPhotoPreview(URL.createObjectURL(blob))
          break
        }
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let photoUrl: string | null = existingRecipe?.photo_url ?? null

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

    if (existingRecipe) {
      await supabase
        .from("recipes")
        .update({
          title,
          description: description || null,
          instructions: recipeText || null,
          photo_url: photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecipe.id)

      await supabase.from("recipe_ingredients").delete().eq("recipe_id", existingRecipe.id)
      router.push(`/meals/recipes/${existingRecipe.id}`)
    } else {
      const { data: recipe } = await supabase
        .from("recipes")
        .insert({
          title,
          description: description || null,
          instructions: recipeText || null,
          photo_url: photoUrl,
          created_by: userId,
        })
        .select()
        .single()

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

        {/* Photo */}
        <div className="space-y-2">
          <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">Photo (optional)</Label>
          {photoPreview ? (
            <div className="relative h-40 rounded-xl overflow-hidden group">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              className="h-28 rounded-xl border-2 border-dashed border-sand bg-limestone flex flex-col items-center justify-center gap-1 text-muted-foreground text-sm cursor-pointer hover:border-ocean-mid transition-colors"
              onClick={() => document.getElementById("photo-input")?.click()}
            >
              <span className="text-2xl">📷</span>
              <span>Click to upload or paste an image anywhere (⌘V / Ctrl+V)</span>
            </div>
          )}
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Full recipe */}
      <div className="rounded-2xl bg-white border border-sand shadow-sm p-5 space-y-2">
        <Label className="text-dusk text-xs font-semibold uppercase tracking-wide">
          Recipe — ingredients & method
        </Label>
        <Textarea
          value={recipeText}
          onChange={(e) => setRecipeText(e.target.value)}
          placeholder={"Paste or type the full recipe here…\n\nIngredients:\n- 500g mince\n- 1 onion\n\nMethod:\n1. Brown the mince\n2. Add tomatoes\n3. Simmer for 20 mins"}
          rows={14}
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
