"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserAvatar } from "./UserAvatar"
import type { Profile } from "@/lib/types"

const PALETTE = [
  { label: "Ocean Deep",  hex: "#1B4F72" },
  { label: "Ocean Mid",   hex: "#2E86AB" },
  { label: "Seafoam",     hex: "#5DA2A8" },
  { label: "Rainforest",  hex: "#2D6A4F" },
  { label: "Fern",        hex: "#52B788" },
  { label: "Cliff Gold",  hex: "#C9A84C" },
  { label: "Dusk",        hex: "#4A3728" },
  { label: "Coral",       hex: "#E07A5F" },
  { label: "Lavender",    hex: "#8B7DAF" },
  { label: "Rose",        hex: "#C26E86" },
  { label: "Sky",         hex: "#4A90D9" },
  { label: "Olive",       hex: "#7A8A4A" },
  { label: "Amber",       hex: "#D4853A" },
  { label: "Slate",       hex: "#6B7F8C" },
  { label: "Berry",       hex: "#7B3B7A" },
  { label: "Sage",        hex: "#6B8E6B" },
]

interface Props {
  profile: Profile
}

export function ProfileSettingsForm({ profile }: Props) {
  const router = useRouter()
  const [colour, setColour] = useState(profile.colour)
  const [initials, setInitials] = useState(profile.avatar_initials ?? "")
  const [customHex, setCustomHex] = useState("")
  const [isRotatingRoster, setIsRotatingRoster] = useState(profile.is_rotating_roster ?? false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeColour = customHex.match(/^#[0-9A-Fa-f]{6}$/) ? customHex : colour

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch("/api/profile/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colour: activeColour,
        avatar_initials: initials || profile.name.slice(0, 2).toUpperCase(),
        is_rotating_roster: isRotatingRoster,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? "Something went wrong")
    } else {
      setSaved(true)
      router.refresh()
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar preview */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-sand">
        <UserAvatar
          name={profile.name}
          colour={activeColour}
          initials={initials || profile.name.slice(0, 2).toUpperCase()}
          size="lg"
        />
        <div>
          <p className="font-semibold text-dusk">{profile.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Preview of your avatar</p>
        </div>
      </div>

      {/* Colour swatches */}
      <div>
        <h2
          className="text-sm font-bold text-dusk mb-3"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Choose your colour
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {PALETTE.map((swatch) => {
            const isActive = activeColour.toLowerCase() === swatch.hex.toLowerCase() && !customHex.match(/^#[0-9A-Fa-f]{6}$/)
            return (
              <button
                key={swatch.hex}
                onClick={() => { setColour(swatch.hex); setCustomHex("") }}
                title={swatch.label}
                className={`relative w-full aspect-square rounded-xl border-2 transition-transform hover:scale-105 ${
                  isActive ? "border-dusk scale-105 shadow-md" : "border-transparent"
                }`}
                style={{ backgroundColor: swatch.hex }}
              >
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
                    ✓
                  </span>
                )}
                <span className="sr-only">{swatch.label}</span>
              </button>
            )
          })}
        </div>

        {/* Custom hex */}
        <div className="mt-3 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg border-2 border-sand flex-shrink-0"
            style={{ backgroundColor: activeColour }}
          />
          <input
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            placeholder="Custom hex e.g. #FF6B35"
            maxLength={7}
            className="flex-1 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ocean-mid font-mono"
          />
        </div>
        {customHex && !customHex.match(/^#[0-9A-Fa-f]{6}$/) && (
          <p className="text-xs text-red-500 mt-1">Enter a valid hex colour like #1B4F72</p>
        )}
      </div>

      {/* Avatar initials */}
      <div>
        <h2
          className="text-sm font-bold text-dusk mb-1"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Avatar initials
        </h2>
        <p className="text-xs text-muted-foreground mb-2">
          Up to 2 characters shown inside your avatar circle.
        </p>
        <input
          value={initials}
          onChange={(e) => setInitials(e.target.value.slice(0, 2).toUpperCase())}
          placeholder={profile.name.slice(0, 2).toUpperCase()}
          maxLength={2}
          className="w-20 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-dusk text-center font-bold uppercase focus:outline-none focus:ring-2 focus:ring-ocean-mid"
        />
      </div>

      {/* Rotating roster */}
      <div>
        <h2
          className="text-sm font-bold text-dusk mb-1"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Work schedule
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          If you're on a rotating roster, your weekly work shifts can be entered fresh each week — they won't carry over automatically.
        </p>
        <button
          type="button"
          onClick={() => setIsRotatingRoster((v) => !v)}
          className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3 transition-colors text-left ${
            isRotatingRoster
              ? "border-ocean-mid bg-ocean-mid/5"
              : "border-sand bg-white"
          }`}
        >
          <div
            className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
              isRotatingRoster ? "bg-ocean-mid" : "bg-mist"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                isRotatingRoster ? "left-5" : "left-1"
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-dusk">Rotating roster</p>
            <p className="text-xs text-muted-foreground">
              {isRotatingRoster
                ? "On — your work shifts reset each week"
                : "Off — recurring schedule only"}
            </p>
          </div>
        </button>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && (
        <p className="text-sm text-rainforest font-medium">
          ✓ Settings saved!
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving || (!!customHex && !customHex.match(/^#[0-9A-Fa-f]{6}$/))}
        className="w-full py-3 rounded-xl bg-ocean-mid text-white font-semibold text-sm disabled:opacity-50 hover:bg-ocean-deep transition-colors"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  )
}
