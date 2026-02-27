import type { Role } from "./types"

export const GOR_COLORS = {
  oceanDeep: "#1B4F72",
  oceanMid: "#2E86AB",
  seafoam: "#A8DADC",
  limestone: "#F5F0E8",
  sand: "#E8DCC8",
  rainforest: "#2D6A4F",
  fern: "#52B788",
  mist: "#B7C9D3",
  cliffGold: "#C9A84C",
  dusk: "#4A3728",
}

export const FAMILY_MEMBERS: {
  name: string
  role: Role
  colour: string
  avatar_initials: string
}[] = [
  { name: "Mum", role: "parent", colour: "#1B4F72", avatar_initials: "MU" },
  { name: "Dad", role: "parent", colour: "#2D6A4F", avatar_initials: "DA" },
  { name: "Sam", role: "adult_child", colour: "#2E86AB", avatar_initials: "SA" },
  { name: "Lara", role: "adult_child", colour: "#52B788", avatar_initials: "LA" },
  { name: "Ollie", role: "school_kid", colour: "#C9A84C", avatar_initials: "OL" },
  { name: "Amalee", role: "school_kid", colour: "#5DA2A8", avatar_initials: "AM" },
]

export const GROCERY_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Frozen",
  "Drinks",
  "Cleaning",
  "Personal Care",
  "Other",
]

export const CAT_LITTER_USERS = ["Sam", "Amalee"]

// School hours Monday-Friday: 8am - 4pm
export const SCHOOL_HOURS = { start: 8, end: 16, days: [1, 2, 3, 4, 5] }

// Available waking hours per day (approximate)
export const WAKING_HOURS = 16

export const SCORE_COLORS: Record<number, string> = {
  1: "#52B788",
  2: "#52B788",
  3: "#2E86AB",
  4: "#2E86AB",
  5: "#C9A84C",
  6: "#C9A84C",
  7: "#C9A84C",
  8: "#C0392B",
  9: "#C0392B",
  10: "#C0392B",
}
