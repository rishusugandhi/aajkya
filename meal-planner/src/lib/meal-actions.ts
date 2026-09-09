import type { DatabaseSyncInstance } from "@/db";
import { newId } from "@/lib/ids";

export type AttendanceStatus = "eating" | "not_eating" | "unset";

export function setAttendance(
  db: DatabaseSyncInstance,
  mealId: string,
  userId: string,
  status: AttendanceStatus
): void {
  const existing = db
    .prepare("SELECT id FROM attendance WHERE meal_id = ? AND user_id = ?")
    .get(mealId, userId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE attendance SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, existing.id);
  } else {
    db.prepare(
      "INSERT INTO attendance (id, meal_id, user_id, status) VALUES (?, ?, ?, ?)"
    ).run(newId(), mealId, userId, status);
  }
}

export type AttendanceRow = {
  user_id: string;
  display_name: string;
  status: AttendanceStatus;
};

export function getAttendanceForMeal(
  db: DatabaseSyncInstance,
  mealId: string,
  householdId: string
): AttendanceRow[] {
  return db
    .prepare(
      `SELECT u.id as user_id, u.display_name, COALESCE(a.status, 'unset') as status
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.meal_id = ?
       WHERE u.household_id = ?
       ORDER BY u.created_at`
    )
    .all(mealId, householdId) as AttendanceRow[];
}

export function addComment(
  db: DatabaseSyncInstance,
  mealId: string,
  userId: string,
  body: string
): void {
  db.prepare(
    "INSERT INTO comments (id, meal_id, user_id, body) VALUES (?, ?, ?, ?)"
  ).run(newId(), mealId, userId, body);
}

export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  display_name: string;
};

export function getCommentsForMeal(
  db: DatabaseSyncInstance,
  mealId: string
): CommentRow[] {
  return db
    .prepare(
      `SELECT c.id, c.body, c.created_at, u.display_name
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.meal_id = ? ORDER BY c.created_at ASC`
    )
    .all(mealId) as CommentRow[];
}

export function editMeal(
  db: DatabaseSyncInstance,
  mealId: string,
  newDishId: string,
  changedByUserId: string
): void {
  const meal = db
    .prepare("SELECT actual_dish_id, is_cooking_off FROM meals WHERE id = ?")
    .get(mealId) as { actual_dish_id: string | null; is_cooking_off: number } | undefined;
  if (!meal) throw new Error("Meal not found.");
  if (meal.is_cooking_off) throw new Error("Cannot edit a cooking-off day.");

  db.prepare(
    "UPDATE meals SET actual_dish_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newDishId, mealId);

  db.prepare(
    `INSERT INTO meal_changes (id, meal_id, from_dish_id, to_dish_id, changed_by_user_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(newId(), mealId, meal.actual_dish_id, newDishId, changedByUserId);
}

export type MealChangeRow = {
  from_dish_name: string | null;
  to_dish_name: string | null;
  changed_by: string;
  changed_at: string;
};

export function getChangeHistory(
  db: DatabaseSyncInstance,
  mealId: string
): MealChangeRow[] {
  return db
    .prepare(
      `SELECT fd.name as from_dish_name, td.name as to_dish_name,
              u.display_name as changed_by, mc.changed_at
       FROM meal_changes mc
       LEFT JOIN dishes fd ON fd.id = mc.from_dish_id
       LEFT JOIN dishes td ON td.id = mc.to_dish_id
       JOIN users u ON u.id = mc.changed_by_user_id
       WHERE mc.meal_id = ? ORDER BY mc.changed_at ASC`
    )
    .all(mealId) as MealChangeRow[];
}
