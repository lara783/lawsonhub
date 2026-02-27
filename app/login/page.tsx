"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ocean gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #1B4F72 0%, #2E86AB 35%, #A8DADC 65%, #F5F0E8 100%)",
        }}
      />

      {/* Decorative wave at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 bg-limestone"
        style={{ clipPath: "ellipse(110% 100% at 50% 100%)" }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass rounded-3xl p-8 shadow-2xl">
          {/* Logo & title */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🌊</div>
            <h1
              className="text-3xl font-bold text-ocean-deep mb-1"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Lawson Family Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              Great Ocean Road living
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-dusk font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-limestone border-sand focus:border-ocean-mid"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-dusk font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-limestone border-sand focus:border-ocean-mid"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold rounded-2xl"
              style={{ background: "#1B4F72", color: "#F5F0E8" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
