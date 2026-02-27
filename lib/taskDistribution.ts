import { format, addDays, getDay } from "date-fns"
import type { Profile, Commitment, Task } from "./types"

interface Assignment {
  task_id: string
  user_id: string
  assigned_date: string
  week_start: string
  completed: boolean
  completed_at: null
  label?: string
}

function getDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
}

function effectiveRole(p: Profile): string {
  return p.role === "admin" ? "parent" : p.role
}

export function generateWeeklyAssignments(
  weekStart: Date,
  profiles: Profile[],
  commitments: Commitment[],
  tasks: Task[]
): Assignment[] {
  const assignments: Assignment[] = []
  const weekStr = format(weekStart, "yyyy-MM-dd")

  const eligible = profiles
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // --- Committed hours per person per day ---
  const dailyCommitted: Record<string, Record<string, number>> = {}
  for (const p of eligible) {
    dailyCommitted[p.id] = {}
    for (const day of days) {
      const dayStr = format(day, "yyyy-MM-dd")
      const dow = getDay(day)
      let hours = 0

      if (effectiveRole(p) === "school_kid" && dow >= 1 && dow <= 5) {
        hours += 8
      }

      for (const c of commitments.filter((c) => c.user_id === p.id)) {
        if (c.is_recurring && c.recur_days?.includes(dow)) {
          hours += getDurationHours(c.start_time, c.end_time)
        } else if (!c.is_recurring && !c.roster_week && c.specific_date === dayStr) {
          hours += getDurationHours(c.start_time, c.end_time)
        } else if (c.roster_week === weekStr && c.recur_days?.includes(dow)) {
          hours += getDurationHours(c.start_time, c.end_time)
        }
      }
      dailyCommitted[p.id][dayStr] = Math.min(hours, 16)
    }
  }

  // Free hours available for tasks — reserve 2h/day for leisure
  // Available task window: 7am–8pm = 13 hrs. Reserve 2h for leisure. No tasks outside this window.
  function freeHours(userId: string, dayStr: string): number {
    return Math.max(0, 13 - (dailyCommitted[userId]?.[dayStr] ?? 0) - 2)
  }

  // Free hours within a specific time slot
  function slotFreeHours(userId: string, dayStr: string, dow: number, slotStart: number, slotEnd: number): number {
    const p = eligible.find((q) => q.id === userId)!
    let committed = 0

    if (effectiveRole(p) === "school_kid" && dow >= 1 && dow <= 5) {
      committed += Math.max(0, Math.min(16, slotEnd) - Math.max(8, slotStart))
    }

    for (const c of commitments.filter((c) => c.user_id === userId)) {
      const active = c.is_recurring
        ? c.recur_days?.includes(dow)
        : c.roster_week === weekStr
        ? c.recur_days?.includes(dow)
        : c.specific_date === dayStr
      if (!active) continue
      const [sh, sm] = c.start_time.split(":").map(Number)
      const [eh, em] = c.end_time.split(":").map(Number)
      const cStart = sh + sm / 60
      const cEnd = eh + em / 60
      committed += Math.max(0, Math.min(cEnd, slotEnd) - Math.max(cStart, slotStart))
    }

    return Math.max(0, slotEnd - slotStart - committed)
  }

  function pickPersonForSlot(
    dayStr: string, dow: number, candidateIds: string[], slotStart: number, slotEnd: number
  ): string {
    return candidateIds.reduce((best, id) => {
      const free = slotFreeHours(id, dayStr, dow, slotStart, slotEnd)
      const bestFree = slotFreeHours(best, dayStr, dow, slotStart, slotEnd)
      if (free > bestFree + 0.25) return id
      if (bestFree > free + 0.25) return best
      return (weeklyScore[id] ?? 0) < (weeklyScore[best] ?? 0) ? id : best
    })
  }

  // Track daily assigned minutes, scores, task count, and heavy-task count per person per day
  const dailyMinutes: Record<string, Record<string, number>> = {}
  const dailyScore: Record<string, Record<string, number>> = {}
  const dailyTaskCount: Record<string, Record<string, number>> = {}
  const dailyHeavyCount: Record<string, Record<string, number>> = {} // tasks with score >= 6
  const weeklyScore: Record<string, number> = {}

  for (const p of eligible) {
    dailyMinutes[p.id] = {}
    dailyScore[p.id] = {}
    dailyTaskCount[p.id] = {}
    dailyHeavyCount[p.id] = {}
    weeklyScore[p.id] = 0
    for (const day of days) {
      const dayStr = format(day, "yyyy-MM-dd")
      dailyMinutes[p.id][dayStr] = 0
      dailyScore[p.id][dayStr] = 0
      dailyTaskCount[p.id][dayStr] = 0
      dailyHeavyCount[p.id][dayStr] = 0
    }
  }

  function hasCapacity(userId: string, dayStr: string, taskMins: number): boolean {
    const maxMins = freeHours(userId, dayStr) * 60
    return (dailyMinutes[userId]?.[dayStr] ?? 0) + taskMins <= maxMins
  }

  // For heavy tasks (score >= 6), don't stack two on the same day for the same person
  function hasHeavyCapacity(userId: string, dayStr: string, taskScore: number): boolean {
    if (taskScore < 6) return true
    return (dailyHeavyCount[userId]?.[dayStr] ?? 0) === 0
  }

  // Current mean weekly score across all eligible people — used for equity targeting
  function meanWeeklyScore(): number {
    const scores = eligible.map((p) => weeklyScore[p.id] ?? 0)
    return scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1)
  }

  // Pick the best day for a person: prefer days with no heavy task already (for heavy tasks),
  // then fewest total tasks, then most free hours.
  function bestDayFor(userId: string, taskMins: number, daysToSearch: Date[], taskScore = 0): string {
    const isHeavy = taskScore >= 6
    let bestDay = format(daysToSearch[0], "yyyy-MM-dd")
    let bestHeavy = Infinity
    let bestCount = Infinity
    let bestFree = -Infinity

    for (const day of daysToSearch) {
      const dayStr = format(day, "yyyy-MM-dd")
      if (!hasCapacity(userId, dayStr, taskMins)) continue
      const heavyCount = dailyHeavyCount[userId][dayStr] ?? 0
      const count = dailyTaskCount[userId][dayStr] ?? 0
      const free = freeHours(userId, dayStr)

      // For heavy tasks: strongly prefer days with no heavy task yet
      if (isHeavy && heavyCount > bestHeavy) continue
      if (isHeavy && heavyCount < bestHeavy) {
        bestHeavy = heavyCount; bestCount = count; bestFree = free; bestDay = dayStr
        continue
      }
      if (count < bestCount || (count === bestCount && free > bestFree)) {
        bestHeavy = heavyCount; bestCount = count; bestFree = free; bestDay = dayStr
      }
    }
    return bestDay
  }

  // Pick person for a specific day: closest to mean score (most behind = highest priority),
  // with task-count and daily-load tiebreakers.
  function pickPerson(dayStr: string, candidateIds: string[], taskMins: number, taskScore = 0): string {
    const withCapacity = candidateIds.filter(
      (id) => hasCapacity(id, dayStr, taskMins) && hasHeavyCapacity(id, dayStr, taskScore)
    )
    const pool = withCapacity.length > 0 ? withCapacity : candidateIds

    const mean = meanWeeklyScore()
    return pool.reduce((best, id) => {
      // Gap from mean: positive = behind (should get more tasks)
      const gap = mean - (weeklyScore[id] ?? 0)
      const bestGap = mean - (weeklyScore[best] ?? 0)

      // Prefer the person furthest behind the mean (score equity)
      if (gap > bestGap + 1) return id
      if (bestGap > gap + 1) return best

      // Tiebreaker: fewest tasks today
      const todayCount = dailyTaskCount[id]?.[dayStr] ?? 0
      const bestTodayCount = dailyTaskCount[best]?.[dayStr] ?? 0
      if (todayCount < bestTodayCount) return id
      if (bestTodayCount < todayCount) return best

      // Final tiebreaker: lower normalised daily load
      const free = Math.max(freeHours(id, dayStr), 0.1)
      const dScore = dailyScore[id]?.[dayStr] ?? 0
      const bestFree = Math.max(freeHours(best, dayStr), 0.1)
      const bestDScore = dailyScore[best]?.[dayStr] ?? 0
      return dScore / free < bestDScore / bestFree ? id : best
    })
  }

  // Pick person + day across the week: prioritise whoever is furthest below the mean score.
  // For the chosen day, prefer days with no heavy task already (if this task is heavy).
  function pickPersonAndDay(
    candidateIds: string[],
    taskMins: number,
    daysToSearch: Date[],
    taskScore = 0
  ): { personId: string; dayStr: string } {
    const mean = meanWeeklyScore()

    // Sort candidates: most behind the mean first (score equity)
    const sorted = candidateIds
      .map((id) => ({ id, gap: mean - (weeklyScore[id] ?? 0) }))
      .sort((a, b) => b.gap - a.gap)

    for (const { id } of sorted) {
      const day = bestDayFor(id, taskMins, daysToSearch, taskScore)
      if (hasCapacity(id, day, taskMins) && hasHeavyCapacity(id, day, taskScore)) {
        return { personId: id, dayStr: day }
      }
    }

    // Fallback: ignore heavy cap, just pick most-behind person
    for (const { id } of sorted) {
      const day = bestDayFor(id, taskMins, daysToSearch, 0)
      if (hasCapacity(id, day, taskMins)) {
        return { personId: id, dayStr: day }
      }
    }

    // Final fallback: first candidate, first day
    const fallbackId = sorted[0].id
    return { personId: fallbackId, dayStr: format(daysToSearch[0], "yyyy-MM-dd") }
  }

  function record(taskId: string, userId: string, dayStr: string, score: number, mins: number, label?: string) {
    dailyScore[userId][dayStr] = (dailyScore[userId][dayStr] ?? 0) + score
    dailyMinutes[userId][dayStr] = (dailyMinutes[userId][dayStr] ?? 0) + mins
    dailyTaskCount[userId][dayStr] = (dailyTaskCount[userId][dayStr] ?? 0) + 1
    if (score >= 6) {
      dailyHeavyCount[userId][dayStr] = (dailyHeavyCount[userId][dayStr] ?? 0) + 1
    }
    weeklyScore[userId] = (weeklyScore[userId] ?? 0) + score
    assignments.push({
      task_id: taskId,
      user_id: userId,
      assigned_date: dayStr,
      week_start: weekStr,
      completed: false,
      completed_at: null,
      ...(label ? { label } : {}),
    })
  }

  // Week number used for rotating assignments
  const weekNumber = Math.floor(
    (weekStart.getTime() - new Date("2024-01-01").getTime()) / (7 * 24 * 60 * 60 * 1000)
  )

  // Track who cooks dinner on each day — used to exempt them from cleanup tasks
  const dailyCook: Record<string, string> = {} // dayStr → userId
  // Track who does the evening dishwasher — they're exempt from wipe bench / clear table too
  const dailyEveningDishwasher: Record<string, string> = {} // dayStr → userId
  // People who handle cat litter (both always assigned)
  const catLitterPeople = eligible.filter(
    (p) => p.name === "Sam" || p.name === "Amelie" || p.name === "Amalee"
  )

  // --- COOK DINNER ROTATION ---
  const dinnerTask = tasks.find(
    (t) => t.name.toLowerCase().includes("cook dinner") && t.is_active
  )
  if (dinnerTask) {
    const mark = eligible.find((p) => p.name === "Mark")
    const lisa = eligible.find((p) => p.name === "Lisa")

    const sundayDay = days.find((d) => getDay(d) === 0)
    let sundayCook: Profile | null = mark ?? null
    if (sundayDay && lisa && mark) {
      const sundayStr = format(sundayDay, "yyyy-MM-dd")
      const lisaWorksOnSunday = (dailyCommitted[lisa.id]?.[sundayStr] ?? 0) >= 4
      if (!lisaWorksOnSunday) {
        const alternating = [lisa, mark].sort((a, b) => a.name.localeCompare(b.name))
        sundayCook = alternating[weekNumber % 2]
      }
    }

    if (sundayCook && sundayDay) {
      const sundayStr = format(sundayDay, "yyyy-MM-dd")
      dailyCook[sundayStr] = sundayCook.id
      record(dinnerTask.id, sundayCook.id, sundayStr, dinnerTask.score, dinnerTask.estimated_minutes ?? 60)
    }

    const weekdayEligible = sundayCook
      ? eligible.filter((p) => p.id !== sundayCook!.id)
      : eligible
    const weekdayParents = weekdayEligible
      .filter((p) => ["parent", "admin"].includes(effectiveRole(p)))
      .sort((a, b) => a.name.localeCompare(b.name))
    const doubleParent = weekdayParents.length > 0
      ? weekdayParents[weekNumber % weekdayParents.length]
      : null

    const cookAssigned = new Set<string>()
    for (const day of days) {
      const dow = getDay(day)
      if (dow === 0) continue
      const dayStr = format(day, "yyyy-MM-dd")
      const notYet = weekdayEligible.filter((p) => !cookAssigned.has(p.id)).map((p) => p.id)
      const pool = notYet.length > 0
        ? notYet
        : (doubleParent ? [doubleParent.id] : weekdayEligible.map((p) => p.id))
      const cook = pickPersonForSlot(dayStr, dow, pool, 17, 20)
      cookAssigned.add(cook)
      dailyCook[dayStr] = cook
      record(dinnerTask.id, cook, dayStr, dinnerTask.score, dinnerTask.estimated_minutes ?? 60)
    }
  }

  // --- Task pool helper ---
  function getTaskPool(task: Task): Profile[] {
    const name = task.name.toLowerCase()

    if (name.includes("cat litter")) {
      const pool = eligible.filter(
        (p) => p.name === "Sam" || p.name === "Amalee" || p.name === "Amelie"
      )
      return pool.length > 0 ? pool : eligible
    }

    if (name.includes("clean main bathroom")) {
      const pool = eligible.filter((p) => !["parent", "admin"].includes(effectiveRole(p)))
      return pool.length > 0 ? pool : eligible
    }

    if (name.includes("master bathroom") || name.includes("master bedroom")) {
      const pool = eligible.filter((p) => ["parent", "admin"].includes(effectiveRole(p)))
      return pool.length > 0 ? pool : eligible
    }

    if ((task.assigned_roles?.length ?? 0) > 0) {
      const pool = eligible.filter((p) => task.assigned_roles.includes(effectiveRole(p)))
      return pool.length > 0 ? pool : eligible
    }
    return eligible
  }

  // --- WASHING CYCLE ---
  const washStart = tasks.find(t => t.is_active && t.name.toLowerCase().startsWith("washing"))
  const washDryer = tasks.find(t => t.is_active && t.name.toLowerCase().includes("put washing in dryer"))
  const washFold  = tasks.find(t => t.is_active && t.name.toLowerCase().includes("fold washing"))
  const washingTaskIds = new Set([washStart?.id, washDryer?.id, washFold?.id].filter(Boolean) as string[])

  if (washStart || washDryer || washFold) {
    const washPool = eligible.map(p => p.id)

    for (const day of days) {
      const dayStr = format(day, "yyyy-MM-dd")
      const used: string[] = []

      if (washStart) {
        const p1 = pickPerson(dayStr, washPool, washStart.estimated_minutes ?? 10)
        record(washStart.id, p1, dayStr, washStart.score, washStart.estimated_minutes ?? 10)
        used.push(p1)
      }
      if (washDryer) {
        const pool2 = washPool.filter(id => !used.includes(id))
        const p2 = pickPerson(dayStr, pool2.length > 0 ? pool2 : washPool, washDryer.estimated_minutes ?? 5)
        record(washDryer.id, p2, dayStr, washDryer.score, washDryer.estimated_minutes ?? 5)
        used.push(p2)
      }
      if (washFold) {
        const pool3 = washPool.filter(id => !used.includes(id))
        const p3 = pickPerson(dayStr, pool3.length > 0 ? pool3 : washPool.filter(id => !used.slice(0, 1).includes(id)), washFold.estimated_minutes ?? 20)
        record(washFold.id, p3, dayStr, washFold.score, washFold.estimated_minutes ?? 20)
      }
    }
  }

  // --- DAILY TASKS ---
  const dailyTasks = tasks.filter(
    (t) => t.frequency === "daily" && t.is_active
      && !t.name.toLowerCase().includes("cook dinner")
      && !washingTaskIds.has(t.id)
  )

  // Pre-pass: assign dishwasher first so we know who's on evening duty before
  // assigning wipe bench / clear table (they should never stack on the same person)
  const dishwasherTask = dailyTasks.find((t) => t.name.toLowerCase().includes("dishwasher"))
  if (dishwasherTask) {
    const timesPerDay = dishwasherTask.frequency_per_day ?? 1
    const taskMins = Math.ceil((dishwasherTask.estimated_minutes ?? 15) / timesPerDay)
    for (const day of days) {
      const dayStr = format(day, "yyyy-MM-dd")
      const dow = getDay(day)
      if (timesPerDay === 2) {
        const todayCook = dailyCook[dayStr]
        const allIds = eligible.map((p) => p.id)
        const dishPool = todayCook && allIds.length > 1
          ? allIds.filter((id) => id !== todayCook)
          : allIds
        const morningPerson = pickPersonForSlot(dayStr, dow, dishPool, 7, 10)
        record(dishwasherTask.id, morningPerson, dayStr, dishwasherTask.score, taskMins, "morning")
        const eveningPool = dishPool.length > 1 ? dishPool.filter((id) => id !== morningPerson) : dishPool
        const eveningPerson = pickPersonForSlot(dayStr, dow, eveningPool, 18, 20)
        record(dishwasherTask.id, eveningPerson, dayStr, dishwasherTask.score, taskMins, "evening")
        dailyEveningDishwasher[dayStr] = eveningPerson
      }
    }
  }

  for (const day of days) {
    const dayStr = format(day, "yyyy-MM-dd")
    const dow = getDay(day)

    for (const task of dailyTasks) {
      // Dishwasher already handled in pre-pass above
      if (task.name.toLowerCase().includes("dishwasher")) continue

      const timesPerDay = task.frequency_per_day ?? 1
      const taskMins = Math.ceil((task.estimated_minutes ?? 15) / timesPerDay)

      // Cat litter daily scoop: both Sam and Amelie every day
      if (task.name.toLowerCase().includes("cat litter")) {
        const pool = catLitterPeople.length > 0 ? catLitterPeople : eligible
        for (const p of pool) {
          record(task.id, p.id, dayStr, task.score, taskMins)
        }
        continue
      }

      for (let rep = 0; rep < timesPerDay; rep++) {
        const isPutAway = task.name.toLowerCase().includes("put away own clothes")
        if (isPutAway) {
          for (const p of eligible) {
            record(task.id, p.id, dayStr, task.score, taskMins)
          }
          continue
        }

        const isLunch = task.name.toLowerCase().includes("make lunch")
        if (isLunch) {
          if (dow === 5 || dow === 6) continue
          const schoolKids = eligible.filter((p) => effectiveRole(p) === "school_kid")
          if (schoolKids.length > 0) {
            for (const kid of schoolKids) {
              record(task.id, kid.id, dayStr, task.score, taskMins)
            }
            continue
          }
        }

        const isLunchbox = task.name.toLowerCase().includes("lunchbox")
        if (isLunchbox) {
          if (dow < 1 || dow > 5) continue
          const kids = eligible.filter(
            (p) => p.name === "Ollie" || p.name === "Amelie" || p.name === "Amalee"
          )
          for (const kid of kids) {
            record(task.id, kid.id, dayStr, task.score, taskMins)
          }
          continue
        }

        const todayCook = dailyCook[dayStr]
        const eveningDishwasherToday = dailyEveningDishwasher[dayStr]

        // Tasks that the cook is exempt from on their cooking day
        const isCookExemptTask =
          task.name.toLowerCase().includes("clear table") ||
          task.name.toLowerCase().includes("bench") ||
          task.name.toLowerCase().includes("leftovers") ||
          task.name.toLowerCase().includes("take out garbage") ||
          task.name.toLowerCase().includes("walk bowie") ||
          task.name.toLowerCase().includes("feed bowie")

        // Evening chores: exclude today's cook AND whoever is doing the evening dishwasher
        // (the person packing the dishwasher shouldn't also have to wipe down and clear up)
        const isEveningChore =
          task.name.toLowerCase().includes("clear table") ||
          task.name.toLowerCase().includes("bench") ||
          task.name.toLowerCase().includes("leftovers") ||
          task.name.toLowerCase().includes("take out garbage") ||
          task.name.toLowerCase().includes("walk bowie")
        if (isEveningChore) {
          const basePool = getTaskPool(task).map((p) => p.id)
          const pool = basePool.filter((id) => {
            if (basePool.length <= 1) return true
            if (todayCook && id === todayCook) return false
            if (eveningDishwasherToday && id === eveningDishwasherToday) return false
            return true
          })
          const finalPool = pool.length > 0 ? pool : basePool
          const target = pickPersonForSlot(dayStr, dow, finalPool, 18, 20)
          record(task.id, target, dayStr, task.score, taskMins)
          continue
        }

        const isSchoolRun = task.name.toLowerCase().includes("take kids to school")
        if (isSchoolRun) {
          if (dow < 1 || dow > 5) continue
          const pool = getTaskPool(task).map((p) => p.id)
          const target = pickPersonForSlot(dayStr, dow, pool, 7, 9)
          record(task.id, target, dayStr, task.score, taskMins)
          continue
        }

        const basePool = getTaskPool(task).map((p) => p.id)
        // Exclude today's cook from feed Bowie
        const pool = (isCookExemptTask && todayCook && basePool.length > 1)
          ? basePool.filter((id) => id !== todayCook)
          : basePool
        const target = pickPerson(dayStr, pool, taskMins)
        record(task.id, target, dayStr, task.score, taskMins)
      }
    }
  }

  // --- WEEKLY TASKS ---
  const weeklyTasks = tasks.filter((t) => t.frequency === "weekly" && t.is_active)

  const sortedEligible = [...eligible].sort((a, b) => a.name.localeCompare(b.name))
  const weekendDays = days.filter((d) => getDay(d) === 6 || getDay(d) === 0)

  for (const task of weeklyTasks) {
    const taskMins = task.estimated_minutes ?? 30
    const taskName = task.name.toLowerCase()

    // Change sheets: every person, on their least-loaded day (not just freest)
    const isPersonalWeekly = taskName.includes("change sheets")
    if (isPersonalWeekly) {
      for (const p of eligible) {
        const bestDay = bestDayFor(p.id, taskMins, days)
        record(task.id, p.id, bestDay, task.score, taskMins)
      }
      continue
    }

    // Pool: Mark's job every weekend (Sat or Sun)
    if (taskName.includes("pool")) {
      const mark = eligible.find((p) => p.name === "Mark")
        ?? eligible.filter((p) => effectiveRole(p) === "parent")[0]
        ?? eligible[0]
      const daysToSearch = weekendDays.length > 0 ? weekendDays : days
      const poolDay = bestDayFor(mark.id, taskMins, daysToSearch)
      record(task.id, mark.id, poolDay, task.score, taskMins)
      continue
    }

    // Master bathroom / master bedroom: Lisa on day off, otherwise Mark
    const isMasterTask = taskName.includes("master bathroom") || taskName.includes("master bedroom")
    if (isMasterTask) {
      const lisa = eligible.find((p) => p.name === "Lisa")
      const mark = eligible.find((p) => p.name === "Mark")
      const parentFallback = eligible.filter((p) => ["parent", "admin"].includes(effectiveRole(p)))[0]

      if (lisa) {
        const weekdays = days.filter((d) => getDay(d) >= 1 && getDay(d) <= 5)
        const dayOff = weekdays
          .map((d) => ({ day: d, committed: dailyCommitted[lisa.id]?.[format(d, "yyyy-MM-dd")] ?? 0 }))
          .filter(({ committed }) => committed < 4)
          .sort((a, b) => a.committed - b.committed)[0]

        if (dayOff) {
          record(task.id, lisa.id, format(dayOff.day, "yyyy-MM-dd"), task.score, taskMins)
          continue
        }
      }
      const assigned = mark ?? parentFallback
      if (assigned) {
        const bestDay = bestDayFor(assigned.id, taskMins, days, task.score)
        record(task.id, assigned.id, bestDay, task.score, taskMins)
      }
      continue
    }

    // Mow lawn: weekend only, rotates through the whole family week by week
    if (taskName.includes("mow lawn")) {
      const mower = sortedEligible[weekNumber % sortedEligible.length]
      const daysToSearch = weekendDays.length > 0 ? weekendDays : days
      const mowDay = bestDayFor(mower.id, taskMins, daysToSearch, task.score)
      record(task.id, mower.id, mowDay, task.score, taskMins)
      continue
    }

    // Vacuum own room: non-parents each vacuum their own room; parents share one room
    // (Lisa on her day off, Mark otherwise — same logic as master bathroom)
    if (taskName.includes("vacuum own room")) {
      // Every non-parent vacuums their own room on their least-loaded day
      const nonParents = eligible.filter((p) => !["parent", "admin"].includes(effectiveRole(p)))
      for (const p of nonParents) {
        const bestDay = bestDayFor(p.id, taskMins, days)
        record(task.id, p.id, bestDay, task.score, taskMins)
      }

      // Parents share a room: Lisa if she has a day off, otherwise Mark
      const lisa = eligible.find((p) => p.name === "Lisa")
      const mark = eligible.find((p) => p.name === "Mark")
      const parentFallback = eligible.filter((p) => ["parent", "admin"].includes(effectiveRole(p)))[0]

      if (lisa) {
        const weekdays = days.filter((d) => getDay(d) >= 1 && getDay(d) <= 5)
        const dayOff = weekdays
          .map((d) => ({ day: d, committed: dailyCommitted[lisa.id]?.[format(d, "yyyy-MM-dd")] ?? 0 }))
          .filter(({ committed }) => committed < 4)
          .sort((a, b) => a.committed - b.committed)[0]

        if (dayOff) {
          record(task.id, lisa.id, format(dayOff.day, "yyyy-MM-dd"), task.score, taskMins)
          continue
        }
      }
      const parentAssigned = mark ?? parentFallback
      if (parentAssigned) {
        const bestDay = bestDayFor(parentAssigned.id, taskMins, days)
        record(task.id, parentAssigned.id, bestDay, task.score, taskMins)
      }
      continue
    }

    // Vacuum whole house: Mark only every 5 weeks, otherwise excluded
    if (taskName.includes("vacuum whole house")) {
      const isMarksTurn = weekNumber % 5 === 0
      const vacPool = getTaskPool(task).filter((p) => isMarksTurn || p.name !== "Mark")
      const pool = vacPool.length > 0 ? vacPool : getTaskPool(task)
      const { personId, dayStr } = pickPersonAndDay(pool.map(p => p.id), taskMins, days, task.score)
      record(task.id, personId, dayStr, task.score, taskMins)
      continue
    }

    // Wheelie bins: always on Thursday (bin night), rotates through all family members
    if (taskName.includes("wheelie bin") || taskName.includes("wheelie-bin") || taskName.includes("bins out") || taskName.includes("put out bin")) {
      const thursday = days.find((d) => getDay(d) === 4)
      if (!thursday) continue
      const thursdayStr = format(thursday, "yyyy-MM-dd")
      const rotatingPerson = sortedEligible[weekNumber % sortedEligible.length]
      record(task.id, rotatingPerson.id, thursdayStr, task.score, taskMins)
      continue
    }

    // Cat litter weekly (pee pad): both Sam and Amelie each do it once
    if (taskName.includes("cat litter") || taskName.includes("pee mat") || taskName.includes("pee pad")) {
      const pool = catLitterPeople.length > 0 ? catLitterPeople : eligible
      for (const p of pool) {
        const bestDay = bestDayFor(p.id, taskMins, days, task.score)
        record(task.id, p.id, bestDay, task.score, taskMins)
      }
      continue
    }

    // All other weekly tasks: pick the person+day combo that best spreads load
    const taskPool = getTaskPool(task)
    if (taskPool.length === 0) continue
    const { personId, dayStr } = pickPersonAndDay(taskPool.map(p => p.id), taskMins, days, task.score)
    record(task.id, personId, dayStr, task.score, taskMins)
  }

  // --- FORTNIGHTLY TASKS ---
  if (weekNumber % 2 === 0) {
    const fortnightlyTasks = tasks.filter((t) => t.frequency === "fortnightly" && t.is_active)
    for (const task of fortnightlyTasks) {
      const taskMins = task.estimated_minutes ?? 40
      const taskPool = getTaskPool(task)
      if (taskPool.length === 0) continue
      const { personId, dayStr } = pickPersonAndDay(taskPool.map(p => p.id), taskMins, days, task.score)
      record(task.id, personId, dayStr, task.score, taskMins)
    }
  }

  // --- MONTHLY TASKS ---
  if (weekStart.getDate() <= 7) {
    const monthlyTasks = tasks.filter((t) => t.frequency === "monthly" && t.is_active)
    for (const task of monthlyTasks) {
      const taskMins = task.estimated_minutes ?? 30

      // Cat litter monthly (full tray clean): both Sam and Amelie do it
      if (task.name.toLowerCase().includes("cat litter")) {
        const pool = catLitterPeople.length > 0 ? catLitterPeople : eligible
        for (const p of pool) {
          const bestDay = bestDayFor(p.id, taskMins, days, task.score)
          record(task.id, p.id, bestDay, task.score, taskMins)
        }
        continue
      }

      const taskPool = getTaskPool(task)
      if (taskPool.length === 0) continue
      const { personId, dayStr } = pickPersonAndDay(taskPool.map(p => p.id), taskMins, days, task.score)
      record(task.id, personId, dayStr, task.score, taskMins)
    }
  }

  return assignments
}
