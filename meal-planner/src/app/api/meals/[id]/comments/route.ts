import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { addComment, getCommentsForMeal } from "@/lib/meal-actions";

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
  const { body: text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  const meal = db
    .prepare("SELECT id FROM meals WHERE id = ? AND household_id = ?")
    .get(id, user.household_id);
  if (!meal) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }

  addComment(db, id, user.id, text.trim());
  return NextResponse.json({ comments: getCommentsForMeal(db, id) });
}
