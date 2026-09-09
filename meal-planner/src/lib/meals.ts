import type { DatabaseSyncInstance } from "@/db";
import { newId } from "@/lib/ids";

export type MealSlot = "lunch" | "dinner";

export type DishRecord = {
  id: string;
  household_id: string;
  name: string;
  ingredient_ids: string; // JSON array
  tags: string; // JSON array
};

export type MealRecord = {
  id: string;
  household_id: string;
  date: string; // YYYY-MM-DD
  slot: MealSlot;
  planned_dish_id: string | null;
  actual_dish_id: string | null;
  is_cooking_off: number;
};

function dayOfWeek(dateStr: string): number {
  // 0 = Sunday .. 6 = Saturday, computed in a timezone-agnostic way
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isSunday(dateStr: string): boolean {
  return dayOfWeek(dateStr) === 0;
}

export function isSaturday(dateStr: string): boolean {
  return dayOfWeek(dateStr) === 6;
}

function last30DaysWindow(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1, d));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { start: start.toISOString().slice(0, 10), end: dateStr };
}

/**
 * Suggest a dish for a given date+slot based on recency of the dish itself
 * and its ingredients over the last 30 days. Rule-based, not optimization:
 * heavier penalty for very-recent repeats, decaying toward day 30.
 */
export function suggestDish(
  db: DatabaseSyncInstance,
  householdId: string,
  dateStr: string
): DishRecord | null {
  if (isSunday(dateStr)) return null;

  const dayTag = isSaturday(dateStr) ? null : "weekday"; // Saturday allows either
  const candidatesRaw = db
    .prepare("SELECT * FROM dishes WHERE household_id = ?")
    .all(householdId) as DishRecord[];

  const candidates = candidatesRaw.filter((d) => {
    const tags: string[] = JSON.parse(d.tags);
    if (dayTag) return tags.includes(dayTag);
    // Saturday: weekday dishes always eligible; weekend_special only ~40% of the time
    if (tags.includes("weekend_special")) return Math.random() < 0.4;
    return tags.includes("weekday");
  });

  if (candidates.length === 0) return null;

  const { start } = last30DaysWindow(dateStr);
  const recentMeals = db
    .prepare(
      `SELECT actual_dish_id, date FROM meals
       WHERE household_id = ? AND date >= ? AND date < ?
       AND actual_dish_id IS NOT NULL`
    )
    .all(householdId, start, dateStr) as { actual_dish_id: string; date: string }[];

  const dishIdToDaysAgo = new Map<string, number>();
  const ingredientIdToDaysAgo = new Map<string, number>();
  const dishById = new Map(candidatesRaw.map((d) => [d.id, d]));

  const [ty, tm, td] = dateStr.split("-").map(Number);
  const today = Date.UTC(ty, tm - 1, td);

  for (const m of recentMeals) {
    const [my, mm, md] = m.date.split("-").map(Number);
    const daysAgo = Math.round((today - Date.UTC(my, mm - 1, md)) / 86400000);
    const prevBest = dishIdToDaysAgo.get(m.actual_dish_id);
    if (prevBest === undefined || daysAgo < prevBest) {
      dishIdToDaysAgo.set(m.actual_dish_id, daysAgo);
    }
    const dish = dishById.get(m.actual_dish_id);
    if (dish) {
      const ingredientIds: string[] = JSON.parse(dish.ingredient_ids);
      for (const ingId of ingredientIds) {
        const prev = ingredientIdToDaysAgo.get(ingId);
        if (prev === undefined || daysAgo < prev) {
          ingredientIdToDaysAgo.set(ingId, daysAgo);
        }
      }
    }
  }

  function recencyPenalty(daysAgo: number | undefined): number {
    if (daysAgo === undefined) return 0;
    // very recent = heavy penalty, decays linearly to ~0 by day 30
    return Math.max(0, 30 - daysAgo);
  }

  let best: DishRecord | null = null;
  let bestScore = -Infinity;
  for (const dish of candidates) {
    const ingredientIds: string[] = JSON.parse(dish.ingredient_ids);
    let penalty = recencyPenalty(dishIdToDaysAgo.get(dish.id)) * 2; // dish repeat weighted heavier
    for (const ingId of ingredientIds) {
      penalty += recencyPenalty(ingredientIdToDaysAgo.get(ingId));
    }
    // exclude dishes sharing a dominant ingredient eaten in the last 2 days
    const tooSoon = ingredientIds.some((ingId) => {
      const daysAgo = ingredientIdToDaysAgo.get(ingId);
      return daysAgo !== undefined && daysAgo <= 2;
    });
    const score = (tooSoon ? -1000 : 0) - penalty + Math.random() * 3; // small jitter for variety
    if (score > bestScore) {
      bestScore = score;
      best = dish;
    }
  }

  return best;
}

/**
 * Ensure a meal row exists for date+slot. Sunday always becomes
 * cooking-off with no dish. Idempotent — safe to call repeatedly.
 */
export function ensureMeal(
  db: DatabaseSyncInstance,
  householdId: string,
  dateStr: string,
  slot: MealSlot
): MealRecord {
  const existing = db
    .prepare(
      "SELECT * FROM meals WHERE household_id = ? AND date = ? AND slot = ?"
    )
    .get(householdId, dateStr, slot) as MealRecord | undefined;
  if (existing) return existing;

  const id = newId();
  if (isSunday(dateStr)) {
    db.prepare(
      `INSERT INTO meals (id, household_id, date, slot, is_cooking_off)
       VALUES (?, ?, ?, ?, 1)`
    ).run(id, householdId, dateStr, slot);
  } else {
    const dish = suggestDish(db, householdId, dateStr);
    db.prepare(
      `INSERT INTO meals (id, household_id, date, slot, planned_dish_id, actual_dish_id, is_cooking_off)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(id, householdId, dateStr, slot, dish?.id ?? null, dish?.id ?? null);
  }

  return db
    .prepare("SELECT * FROM meals WHERE id = ?")
    .get(id) as MealRecord;
}

export function ensureMealsForRange(
  db: DatabaseSyncInstance,
  householdId: string,
  startDate: string,
  days: number
): MealRecord[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const results: MealRecord[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const dateStr = dt.toISOString().slice(0, 10);
    results.push(ensureMeal(db, householdId, dateStr, "lunch"));
    results.push(ensureMeal(db, householdId, dateStr, "dinner"));
  }
  return results;
}
