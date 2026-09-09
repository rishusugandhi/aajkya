import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { seedFoodAndDishLibrary } from "@/lib/seed";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  seedFoodAndDishLibrary(db, user.household_id);
  const dishes = db
    .prepare("SELECT id, name, tags FROM dishes WHERE household_id = ? ORDER BY name")
    .all(user.household_id) as { id: string; name: string; tags: string }[];
  return NextResponse.json({
    dishes: dishes.map((d) => ({ id: d.id, name: d.name, tags: JSON.parse(d.tags) })),
  });
}
