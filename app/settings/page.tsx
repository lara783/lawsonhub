export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm"
import type { Profile } from "@/lib/types"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  return (
    <div className="min-h-screen bg-limestone pb-24 md:pb-8">
      <Navbar user={profile as Profile} />
      <main className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1
            className="text-2xl font-bold text-ocean-deep"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            My Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalise your avatar colour and initials.
          </p>
        </div>

        <div className="rounded-2xl bg-limestone border border-sand p-5 shadow-sm">
          <ProfileSettingsForm profile={profile as Profile} />
        </div>
      </main>
    </div>
  )
}
