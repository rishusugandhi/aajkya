import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { editMeal, getChangeHistory } from "@/lib/meal-actions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { dishId } = (body ?? {}) as Record<string, unknown>;
  if (typeof dishId !== "string") {
    return NextResponse.json({ error: "dishId is required." }, { status: 400 });
  }

  const meal = db
    .prepare("SELECT id FROM meals WHERE id = ? AND household_id = ?")
    .get(id, user.household_id);
  if (!meal) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }
  const dish = db
    .prepare("SELECT id FROM dishes WHERE id = ? AND household_id = ?")
    .get(dishId, user.household_id);
  if (!dish) {
    return NextResponse.json(
      { error: "Dish must be from the approved library." },
      { status: 400 }
    );
  }

  try {
    editMeal(db, id, dishId, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not edit meal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ changeHistory: getChangeHistory(db, id) });
}
