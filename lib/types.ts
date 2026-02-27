export type Role = "parent" | "adult_child" | "school_kid" | "admin"
export type CommitmentType = "work" | "school" | "sport" | "other"
export type TaskFrequency = "daily" | "weekly" | "fortnightly" | "monthly"

export interface Profile {
  id: string
  name: string
  role: Role
  colour: string
  avatar_initials: string
  is_rotating_roster?: boolean
  created_at?: string
}

export interface Commitment {
  id: string
  user_id: string
  title: string
  commitment_type: CommitmentType
  is_recurring: boolean
  recur_days: number[]
  start_time: string
  end_time: string
  specific_date: string | null
  roster_week: string | null   // set for rotating-roster entries; scoped to one week
  created_at?: string
}

export interface Task {
  id: string
  name: string
  score: number
  frequency: TaskFrequency
  frequency_per_day: number
  estimated_minutes: number | null
  assigned_roles: string[]
  notes: string | null
  is_active: boolean
}

export interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  assigned_date: string
  week_start: string
  completed: boolean
  completed_at: string | null
  label?: string | null
  created_at?: string
  task?: Task
  user?: Profile
}

export interface JobSwapRequest {
  id: string
  requester_id: string
  requester_assignment_id: string
  target_id: string
  target_assignment_id: string
  status: "pending" | "approved" | "rejected"
  created_at?: string
  resolved_at?: string | null
  resolved_by?: string | null
  requester?: Profile
  target?: Profile
  requester_assignment?: TaskAssignment
  target_assignment?: TaskAssignment
}

export interface WeeklyNote {
  id: string
  week_start: string
  created_by: string
  content: string
  created_at?: string
}

export interface GroceryList {
  id: string
  week_start: string
  shopping_done: boolean
  shopping_done_by: string | null
  shopping_done_at: string | null
  created_at?: string
}

export interface GroceryItem {
  id: string
  list_id: string
  name: string
  quantity: string | null
  category: string | null
  added_by: string
  from_recipe_id: string | null
  checked: boolean
  created_at?: string
  added_by_profile?: Profile
}

export interface Recipe {
  id: string
  title: string
  description: string | null
  photo_url: string | null
  instructions: string | null
  created_by: string
  created_at?: string
  updated_at?: string
  ingredients?: RecipeIngredient[]
  created_by_profile?: Profile
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  quantity: string | null
  sort_order: number
}

export interface MealPlan {
  id: string
  week_start: string
  cook_user_id: string | null
  meal_date: string
  recipe_id: string | null
  custom_meal_name: string | null
  created_at?: string
  recipe?: Recipe
  cook?: Profile
}

export interface MeetingTopic {
  id: string
  week_start: string
  user_id: string
  content: string
  created_at?: string
  author?: Profile
}

export interface FamilyEvent {
  id: string
  title: string
  event_date: string
  description: string | null
  created_by: string
  created_at?: string
  created_by_profile?: Profile
}
