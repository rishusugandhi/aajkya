import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { setAttendance, getAttendanceForMeal } from "@/lib/meal-actions";

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
  const { status } = (body ?? {}) as Record<string, unknown>;
  if (status !== "eating" && status !== "not_eating" && status !== "unset") {
    return NextResponse.json(
      { error: "status must be one of eating, not_eating, unset." },
      { status: 400 }
    );
  }

  const meal = db
    .prepare("SELECT id, is_cooking_off FROM meals WHERE id = ? AND household_id = ?")
    .get(id, user.household_id) as { id: string; is_cooking_off: number } | undefined;
  if (!meal) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }
  if (meal.is_cooking_off) {
    return NextResponse.json(
      { error: "Cannot mark attendance on a cooking-off day." },
      { status: 400 }
    );
  }

  setAttendance(db, id, user.id, status);
  return NextResponse.json({
    attendance: getAttendanceForMeal(db, id, user.household_id),
  });
}
