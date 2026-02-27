# Lawson Family Hub 🌊

A family task management app for the Lawsons — built with Next.js 16, Supabase, and deployed on Vercel. Great Ocean Road aesthetic throughout.

---

## Features

- **Family Calendar** — colour-coded weekly view of everyone's commitments
- **Job Distribution** — weekly household tasks auto-assigned based on how busy each person is
- **Task Scoring** — 1–10 point system for fair workload balancing
- **Dashboard** — each person's daily tasks with one-tap completion
- **Grocery List** — shared list anyone can add to; Mum/Dad/Admin marks shopping done to reset it
- **Meal Planner** — weekly dinner schedule with a recipe book (photo + ingredients + instructions)
- **My Schedule** — upload recurring shifts or one-off commitments
- **Admin Panel** — generate weekly job schedules, manage users and tasks

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd lawson-family-hub
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon public key** from Settings → API

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Run the database migration

In your Supabase dashboard → SQL Editor, paste and run the contents of:
```
supabase/migrations/001_initial.sql
```

Then run the seed file to populate the task list:
```
supabase/seed.sql
```

### 5. Create the recipe photos storage bucket

In Supabase dashboard → Storage → New bucket:
- Name: `recipe-photos`
- Public: ✓ (tick)

### 6. Create family member accounts

In Supabase dashboard → Authentication → Users → Invite user

Create accounts for each family member. When creating each user, set their **User Metadata** like this:

| Name | Role | Colour |
|---|---|---|
| Mum | `parent` | `#1B4F72` |
| Dad | `parent` | `#2D6A4F` |
| Sam | `adult_child` | `#2E86AB` |
| Lara | `adult_child` | `#52B788` |
| Ollie | `school_kid` | `#C9A84C` |
| Amelie | `school_kid` | `#5DA2A8` |
| Admin | `admin` | `#4A3728` |

User metadata JSON example for Mum:
```json
{"name": "Mum", "role": "parent", "colour": "#1B4F72"}
```

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add these environment variables in Vercel dashboard (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

---

## How the Job Distribution Works

Every Monday (or manually via Admin → Generate This Week's Jobs):

1. Each person's committed hours per day are calculated from their schedule
2. School kids (Ollie, Amelie) are blocked Mon–Fri 8am–4pm
3. Daily tasks are assigned to whoever has the most free time that day
4. Cat litter always goes to Sam or Amelie
5. Cook Dinner rotates through all family members (one each, 7 nights)
6. Weekly tasks go to whoever has the lowest total score for the week
7. Fortnightly tasks alternate every two weeks

The Admin can always override any assignment from the job board.

---

## Colour Reference

| Person | Colour | Hex |
|---|---|---|
| Mum | Ocean Deep | `#1B4F72` |
| Dad | Rainforest | `#2D6A4F` |
| Sam | Ocean Mid | `#2E86AB` |
| Lara | Fern | `#52B788` |
| Ollie | Cliff Gold | `#C9A84C` |
| Amelie | Seafoam | `#5DA2A8` |
