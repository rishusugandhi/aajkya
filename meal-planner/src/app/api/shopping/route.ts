import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser, todayInHouseholdTz } from "@/lib/session";
import { seedFoodAndDishLibrary } from "@/lib/seed";
import { ensureMealsForRange } from "@/lib/meals";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get("days") ?? "3"), 14);
  const start = todayInHouseholdTz();

  seedFoodAndDishLibrary(db, user.household_id);
  const meals = ensureMealsForRange(db, user.household_id, start, days);
  const dishIds = [
    ...new Set(
      meals
        .map((m) => m.actual_dish_id ?? m.planned_dish_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (dishIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const dishRows = db
    .prepare(
      `SELECT id, ingredient_ids FROM dishes WHERE id IN (${dishIds.map(() => "?").join(",")})`
    )
    .all(...dishIds) as { id: string; ingredient_ids: string }[];

  const foodIds = new Set<string>();
  for (const d of dishRows) {
    const ids: string[] = JSON.parse(d.ingredient_ids);
    ids.forEach((id) => foodIds.add(id));
  }
  // Drop base staples (rice/roti) from the shopping list — assumed pantry items.
  const foodIdArr = [...foodIds];
  if (foodIdArr.length === 0) {
    return NextResponse.json({ items: [] });
  }
  const foods = db
    .prepare(
      `SELECT id, name, category FROM foods WHERE id IN (${foodIdArr.map(() => "?").join(",")}) AND category != 'base' ORDER BY name`
    )
    .all(...foodIdArr) as { id: string; name: string; category: string }[];

  return NextResponse.json({
    items: foods.map((f) => ({ id: f.id, name: f.name, category: f.category })),
  });
}
