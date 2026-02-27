"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GROCERY_CATEGORIES } from "@/lib/constants"
import type { GroceryList, GroceryItem, Profile } from "@/lib/types"

interface GroceryListProps {
  list: GroceryList | null
  items: GroceryItem[]
  doneList?: GroceryList | null
  doneItems?: GroceryItem[]
  profiles: Profile[]
  currentUserId: string
  currentUserProfile: Profile
  canMarkDone: boolean
}

export function GroceryList({
  list,
  items,
  doneList = null,
  doneItems = [],
  profiles,
  currentUserId,
  currentUserProfile,
  canMarkDone,
}: GroceryListProps) {
  const [localItems, setLocalItems] = useState<GroceryItem[]>(items)
  const [newName, setNewName] = useState("")
  const [newQty, setNewQty] = useState("")
  const [newCategory, setNewCategory] = useState("Other")
  const [adding, setAdding] = useState(false)
  const [isDone, setIsDone] = useState(list?.shopping_done ?? false)
  const router = useRouter()
  const supabase = createClient()

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!list || !newName.trim()) return
    setAdding(true)

    const { data, error } = await supabase
      .from("grocery_items")
      .insert({
        list_id: list.id,
        name: newName.trim(),
        quantity: newQty.trim() || null,
        category: newCategory,
        added_by: currentUserId,
        checked: false,
      })
      .select("*, added_by_profile:profiles!added_by(*)")
      .single()

    if (data && !error) {
      setLocalItems((prev) => [...prev, data as GroceryItem])
      setNewName("")
      setNewQty("")
    }
    setAdding(false)
  }

  async function toggleCheck(item: GroceryItem) {
    const newChecked = !item.checked
    setLocalItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    )
    await supabase
      .from("grocery_items")
      .update({ checked: newChecked })
      .eq("id", item.id)
  }

  async function deleteItem(itemId: string) {
    setLocalItems((prev) => prev.filter((i) => i.id !== itemId))
    await supabase.from("grocery_items").delete().eq("id", itemId)
  }

  async function markShoppingDone() {
    if (!list) return
    await supabase.from("grocery_lists").update({
      shopping_done: true,
      shopping_done_by: currentUserId,
      shopping_done_at: new Date().toISOString(),
    }).eq("id", list.id)
    setIsDone(true)
    router.refresh()
  }

  // Group items by category
  const byCategory = localItems.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const cat = item.category ?? "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const uncheckedCount = localItems.filter((i) => !i.checked).length

  return (
    <div className="space-y-4">
      {/* Add item form — always visible */}
      <form
        onSubmit={addItem}
        className="rounded-2xl bg-white border border-sand shadow-sm p-4 space-y-3"
        style={{ borderLeft: `4px solid ${currentUserProfile.colour}` }}
      >
          <h3
            className="font-semibold text-sm text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Add Item
          </h3>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Item name"
              required
              className="flex-1 bg-limestone border-sand text-sm"
            />
            <Input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Qty"
              className="w-20 bg-limestone border-sand text-sm"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 rounded-xl border border-sand bg-limestone px-3 py-2 text-sm text-dusk focus:outline-none focus:ring-2 focus:ring-ocean-mid"
            >
              {GROCERY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={adding}
              className="rounded-xl px-4"
              style={{ background: currentUserProfile.colour, color: "white" }}
            >
              + Add
            </Button>
          </div>
      </form>

      {/* List */}
      {Object.entries(byCategory).length === 0 ? (
        <div className="rounded-2xl bg-white border border-sand p-8 text-center shadow-sm">
          <div className="text-3xl mb-2">🥦</div>
          <p className="text-sm text-muted-foreground">No items yet. Add something above!</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
            <h2
              className="font-semibold text-ocean-deep"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {isDone ? "Last shop's list" : `${uncheckedCount} item${uncheckedCount !== 1 ? "s" : ""} to get`}
            </h2>
          </div>

          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="px-5 py-2 bg-limestone/60 border-t border-sand">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{cat}</p>
              </div>
              <div className="divide-y divide-sand/40">
                {catItems.map((item) => {
                  const addedBy = profiles.find((p) => p.id === item.added_by)
                  return (
                    <div
                      key={item.id}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-limestone/40 transition-colors"
                    >
                      <button
                        onClick={() => toggleCheck(item)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          item.checked ? "bg-fern border-fern" : "border-mist"
                        }`}
                      >
                        {item.checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <span className={`flex-1 text-sm font-medium ${item.checked ? "line-through text-muted-foreground" : "text-dusk"}`}>
                        {item.name}
                        {item.quantity && (
                          <span className="text-muted-foreground font-normal"> · {item.quantity}</span>
                        )}
                      </span>

                      {addedBy && (
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 opacity-70"
                          style={{ backgroundColor: addedBy.colour }}
                          title={`Added by ${addedBy.name}`}
                        />
                      )}

                      {(item.added_by === currentUserId || currentUserProfile.role === "admin") && (
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-muted-foreground hover:text-red-500 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark shopping done */}
      {canMarkDone && !isDone && localItems.length > 0 && (
        <Button
          onClick={markShoppingDone}
          className="w-full h-12 rounded-2xl text-base font-semibold"
          style={{ background: "#2D6A4F", color: "white" }}
        >
          ✓ Shopping Done — Start Next List
        </Button>
      )}

      {/* Archived done list */}
      {doneList && doneItems.length > 0 && (
        <details className="rounded-2xl bg-white border border-sand shadow-sm overflow-hidden">
          <summary className="px-5 py-3 flex items-center gap-2 cursor-pointer hover:bg-limestone/40 transition-colors list-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex-1">
              Last shop · {new Date(doneList.week_start + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
            <span className="bg-fern/20 text-rainforest text-xs font-semibold px-2 py-0.5 rounded-full">✓ Done</span>
            <span className="text-muted-foreground text-xs ml-1">▾</span>
          </summary>
          <div className="divide-y divide-sand/40 border-t border-sand">
            {doneItems.map((item) => {
              const addedBy = profiles.find((p) => p.id === item.added_by)
              return (
                <div key={item.id} className="px-5 py-2.5 flex items-center gap-3 opacity-60">
                  <span className="w-4 h-4 rounded-full bg-fern/40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-rainforest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="flex-1 text-sm line-through text-muted-foreground">
                    {item.name}
                    {item.quantity && <span className="font-normal"> · {item.quantity}</span>}
                  </span>
                  {addedBy && (
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: addedBy.colour }}
                      title={`Added by ${addedBy.name}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
