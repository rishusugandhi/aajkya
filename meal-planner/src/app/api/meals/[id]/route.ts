import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import {
  getAttendanceForMeal,
  getCommentsForMeal,
  getChangeHistory,
} from "@/lib/meal-actions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await params;

  const meal = db
    .prepare("SELECT * FROM meals WHERE id = ? AND household_id = ?")
    .get(id, user.household_id) as
    | {
        id: string;
        date: string;
        slot: string;
        planned_dish_id: string | null;
        actual_dish_id: string | null;
        is_cooking_off: number;
      }
    | undefined;

  if (!meal) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }

  function dishName(dishId: string | null): string | null {
    if (!dishId) return null;
    const row = db.prepare("SELECT name FROM dishes WHERE id = ?").get(dishId) as
      | { name: string }
      | undefined;
    return row?.name ?? null;
  }

  return NextResponse.json({
    meal: {
      id: meal.id,
      date: meal.date,
      slot: meal.slot,
      isCookingOff: Boolean(meal.is_cooking_off),
      plannedDishName: dishName(meal.planned_dish_id),
      actualDishName: dishName(meal.actual_dish_id),
      attendance: getAttendanceForMeal(db, meal.id, user.household_id),
      comments: getCommentsForMeal(db, meal.id),
      changeHistory: getChangeHistory(db, meal.id),
    },
  });
}
