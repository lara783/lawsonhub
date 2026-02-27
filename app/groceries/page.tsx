export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { GroceryList } from "@/components/GroceryList"
import { format, startOfWeek, addDays } from "date-fns"
import type { Profile, GroceryList as GroceryListType, GroceryItem } from "@/lib/types"

export default async function GroceriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  const nextWeekStart = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7), "yyyy-MM-dd")

  // Get or create this week's grocery list
  let { data: thisWeekList } = await supabase
    .from("grocery_lists")
    .select("*")
    .eq("week_start", thisWeekStart)
    .maybeSingle()

  if (!thisWeekList) {
    const { data: newList } = await supabase
      .from("grocery_lists")
      .insert({ week_start: thisWeekStart })
      .select()
      .single()
    thisWeekList = newList
  }

  // If this week's shopping is done, promote next week's list as the active one
  let activeList = thisWeekList
  let doneList: GroceryListType | null = null

  if (thisWeekList?.shopping_done) {
    doneList = thisWeekList as GroceryListType

    let { data: nextList } = await supabase
      .from("grocery_lists")
      .select("*")
      .eq("week_start", nextWeekStart)
      .maybeSingle()

    if (!nextList) {
      const { data: created } = await supabase
        .from("grocery_lists")
        .insert({ week_start: nextWeekStart })
        .select()
        .single()
      nextList = created
    }

    activeList = nextList
  }

  const [{ data: activeItems }, { data: doneItems }, { data: allProfiles }] = await Promise.all([
    supabase
      .from("grocery_items")
      .select("*, added_by_profile:profiles!added_by(*)")
      .eq("list_id", activeList?.id ?? "")
      .order("created_at"),
    doneList
      ? supabase
          .from("grocery_items")
          .select("*, added_by_profile:profiles!added_by(*)")
          .eq("list_id", doneList.id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("*"),
  ])

  const canMarkDone = profile.role === "admin" || profile.role === "parent"
  const activeWeekStart = activeList?.week_start ?? thisWeekStart

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Grocery List 🛒
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {doneList
              ? `Adding to next week · ${format(new Date(activeWeekStart), "d MMM")}`
              : `Week of ${format(new Date(activeWeekStart), "d MMMM yyyy")}`}
          </p>
        </div>

        <GroceryList
          list={activeList as GroceryListType}
          items={(activeItems ?? []) as GroceryItem[]}
          doneList={doneList}
          doneItems={(doneItems ?? []) as GroceryItem[]}
          profiles={(allProfiles ?? []) as Profile[]}
          currentUserId={user.id}
          currentUserProfile={profile as Profile}
          canMarkDone={canMarkDone}
        />
      </main>
    </div>
  )
}
