import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Called by Vercel Cron every Sunday at 8am AEST (10pm Saturday UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/weekly-reminder", "schedule": "0 22 * * 6" }] }
//
// Required env vars:
//   CRON_SECRET              — random secret, set in Vercel dashboard
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS to read auth emails)
//   RESEND_API_KEY            — from resend.com (free tier is plenty)
//   NEXT_PUBLIC_SUPABASE_URL  — already set

export async function GET(request: Request) {
  // Verify this is Vercel's cron caller (or your own test call with the secret)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  // Use service role to access auth.users for email addresses
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all active family members (not admin)
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, role")
    .neq("role", "admin")

  if (profileError || !profiles?.length) {
    return NextResponse.json({ error: "No profiles found" }, { status: 500 })
  }

  // Get email addresses from auth.users for each profile
  const emailResults: { name: string; email: string }[] = []
  for (const profile of profiles) {
    const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
    if (userData?.user?.email) {
      emailResults.push({ name: profile.name, email: userData.user.email })
    }
  }

  if (!emailResults.length) {
    return NextResponse.json({ error: "No emails found" }, { status: 500 })
  }

  // Send reminder emails via Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lawson-family-hub.vercel.app"
  const sent: string[] = []
  const failed: string[] = []

  for (const { name, email } of emailResults) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lawson Hub <noreply@yourdomain.com>",
        to: email,
        subject: "📅 Don't forget — update your schedule for next week",
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F5F0E8;">
            <h2 style="color: #1B4F72; margin-bottom: 8px;">Hey ${name} 👋</h2>
            <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
              It's Sunday — a quick heads up to log any changes to your schedule for next week so the job roster can be generated correctly.
            </p>
            <p style="color: #4A3728; font-size: 16px; line-height: 1.6;">
              If you have new work shifts, appointments, or anything else that'll affect your availability, add them under <strong>My Schedule</strong>.
            </p>
            <a href="${appUrl}/my-schedule"
               style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B4F72; color: white; border-radius: 12px; text-decoration: none; font-family: Georgia, serif; font-size: 15px; font-weight: bold;">
              Update My Schedule →
            </a>
            <p style="margin-top: 32px; color: #B7C9D3; font-size: 12px;">Lawson Family Hub</p>
          </div>
        `,
      }),
    })

    if (res.ok) {
      sent.push(email)
    } else {
      failed.push(email)
    }
  }

  return NextResponse.json({
    sent: sent.length,
    failed: failed.length,
    details: { sent, failed },
  })
}
