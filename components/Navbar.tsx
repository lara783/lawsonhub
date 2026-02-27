"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UserAvatar } from "./UserAvatar"
import type { Profile } from "@/lib/types"

interface NavbarProps {
  user: Profile
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/jobs", label: "Jobs", icon: "✅" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/groceries", label: "Groceries", icon: "🛒" },
  { href: "/meals", label: "Meals", icon: "🍽️" },
  { href: "/my-schedule", label: "Schedule", icon: "⏰" },
  { href: "/family-meeting", label: "Meeting", icon: "🗣️" },
  { href: "/settings", label: "Settings", icon: "🎨" },
]

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navItems = user.role === "admin"
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : NAV_ITEMS

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
          {navItems.map((item) => {
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
        <div className="flex items-center justify-around py-1.5 px-1">
          {navItems.slice(0, 8).map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-colors min-w-0 ${
                  active ? "text-ocean-deep" : "text-muted-foreground"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="text-[9px] font-medium truncate max-w-[36px]">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
