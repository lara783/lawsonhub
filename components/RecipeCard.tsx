import Link from "next/link"
import type { Recipe } from "@/lib/types"

interface RecipeCardProps {
  recipe: Recipe
  currentUserId: string
  onAddToGroceries?: (recipe: Recipe) => void
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const ingredientCount = recipe.ingredients?.length ?? 0

  return (
    <Link
      href={`/meals/recipes/${recipe.id}`}
      className="block rounded-2xl bg-white border border-sand shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {recipe.photo_url ? (
        <div className="h-40 overflow-hidden">
          <img
            src={recipe.photo_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="h-40 flex items-center justify-center text-5xl"
          style={{ background: "linear-gradient(135deg, #A8DADC 0%, #E8DCC8 100%)" }}
        >
          🍽️
        </div>
      )}

      <div className="p-4">
        <h3
          className="text-lg font-bold text-ocean-deep line-clamp-1"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {ingredientCount > 0 ? `${ingredientCount} ingredient${ingredientCount !== 1 ? "s" : ""}` : ""}
          </span>
          <span className="text-xs font-medium text-ocean-mid">View →</span>
        </div>
      </div>
    </Link>
  )
}
