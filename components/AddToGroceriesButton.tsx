"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface AddToGroceriesButtonProps {
  listId: string
  ingredients: { name: string; quantity: string | null }[]
  recipeId: string
  userId: string
}

export function AddToGroceriesButton({
  listId,
  ingredients,
  recipeId,
  userId,
}: AddToGroceriesButtonProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  async function handleAdd() {
    setLoading(true)
    await supabase.from("grocery_items").insert(
      ingredients.map((ing) => ({
        list_id: listId,
        name: ing.name,
        quantity: ing.quantity,
        category: "Other",
        added_by: userId,
        from_recipe_id: recipeId,
        checked: false,
      }))
    )
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <span className="text-xs font-semibold text-fern">✓ Added to groceries!</span>
    )
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className="text-xs font-semibold text-ocean-mid hover:text-ocean-deep transition-colors disabled:opacity-50"
    >
      {loading ? "Adding…" : "+ Add all to groceries"}
    </button>
  )
}
