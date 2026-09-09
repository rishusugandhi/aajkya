import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser, todayInHouseholdTz } from "@/lib/session";
import { seedFoodAndDishLibrary } from "@/lib/seed";
import { ensureMealsForRange } from "@/lib/meals";
import { getAttendanceForMeal, getCommentsForMeal } from "@/lib/meal-actions";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? todayInHouseholdTz();
  const days = Math.min(Number(url.searchParams.get("days") ?? "7"), 42);

  seedFoodAndDishLibrary(db, user.household_id);
  const meals = ensureMealsForRange(db, user.household_id, start, days);

  const dishIds = [
    ...new Set(
      meals.flatMap((m) => [m.planned_dish_id, m.actual_dish_id]).filter(Boolean)
    ),
  ] as string[];
  const dishRows =
    dishIds.length > 0
      ? (db
          .prepare(
            `SELECT id, name FROM dishes WHERE id IN (${dishIds.map(() => "?").join(",")})`
          )
          .all(...dishIds) as { id: string; name: string }[])
      : [];
  const dishNameById = new Map(dishRows.map((d) => [d.id, d.name]));

  const result = meals.map((m) => {
    const attendance = getAttendanceForMeal(db, m.id, user.household_id);
    const eatingCount = attendance.filter((a) => a.status === "eating").length;
    return {
      id: m.id,
      date: m.date,
      slot: m.slot,
      isCookingOff: Boolean(m.is_cooking_off),
      plannedDishName: m.planned_dish_id
        ? dishNameById.get(m.planned_dish_id) ?? null
        : null,
      actualDishName: m.actual_dish_id
        ? dishNameById.get(m.actual_dish_id) ?? null
        : null,
      attendance,
      eatingCount,
      totalMembers: attendance.length,
      commentCount: getCommentsForMeal(db, m.id).length,
    };
  });

  return NextResponse.json({ meals: result });
}
