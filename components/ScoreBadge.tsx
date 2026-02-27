import { SCORE_COLORS } from "@/lib/constants"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md"
}

export function ScoreBadge({ score, size = "sm" }: ScoreBadgeProps) {
  const color = SCORE_COLORS[score] ?? "#C9A84C"
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"

  return (
    <span
      className={`${sizeClass} rounded-full font-bold text-white inline-flex items-center gap-0.5`}
      style={{ backgroundColor: color }}
    >
      {score}pts
    </span>
  )
}
