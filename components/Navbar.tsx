"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserAvatar } from "./UserAvatar"
import type { Profile } from "@/lib/types"

interface NavbarProps {
  user: Profile
}

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/jobs", label: "Jobs", icon: "✅" },
  { href: "/groceries", label: "Groceries", icon: "🛒" },
  { href: "/my-schedule", label: "Schedule", icon: "⏰" },
]

const SECONDARY_NAV = [
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/meals", label: "Meals", icon: "🍽️" },
  { href: "/family-meeting", label: "Meeting", icon: "🗣️" },
  { href: "/settings", label: "Settings", icon: "🎨" },
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isAdmin = user.role === "admin"
  const desktopItems = isAdmin
    ? [...ALL_NAV, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : ALL_NAV

  const moreItems = isAdmin
    ? [...SECONDARY_NAV, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : SECONDARY_NAV

  // Is the active page in the "more" drawer?
  const moreActive = moreItems.some((item) => item.href === pathname)

  return (
    <>
      {/* Desktop top navbar */}
      <nav className="hidden md:flex items-center justify-between px-6 py-3 glass border-b border-seafoam/30 sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🌊</span>
          <span
            className="text-lg font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Lawson Family Hub
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {desktopItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-ocean-deep text-white"
                    : "text-dusk hover:bg-sand"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-dusk">{user.name}</span>
          <UserAvatar
            name={user.name}
            colour={user.colour}
            initials={user.avatar_initials}
            size="md"
          />
          <button
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-dusk transition-colors px-2 py-1 rounded-lg hover:bg-sand"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile bottom navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-seafoam/30">
        <div className="flex items-center justify-around py-2 px-2">
          {PRIMARY_NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
                  active ? "text-ocean-deep" : "text-muted-foreground"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
              moreOpen || moreActive ? "text-ocean-deep" : "text-muted-foreground"
            }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More drawer overlay */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setMoreOpen(false)}
          />
          {/* Panel */}
          <div className="md:hidden fixed bottom-16 right-0 left-0 z-50 mx-3 mb-1 rounded-2xl bg-white border border-sand shadow-xl overflow-hidden">
            <div className="grid grid-cols-2 gap-0 divide-y divide-sand">
              {moreItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-5 py-4 transition-colors ${
                      active ? "bg-ocean-deep/5 text-ocean-deep font-semibold" : "text-dusk hover:bg-sand/50"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Sign out row */}
            <div className="border-t border-sand px-5 py-3 flex items-center justify-between bg-limestone/50">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={user.name}
                  colour={user.colour}
                  initials={user.avatar_initials}
                  size="sm"
                />
                <span className="text-sm font-medium text-dusk">{user.name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
