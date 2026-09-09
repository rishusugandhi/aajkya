import type { DatabaseSyncInstance } from "@/db";
import { newId } from "@/lib/ids";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { seedFoodAndDishLibrary } from "@/lib/seed";

export type Role = "admin" | "member";

export type UserRecord = {
  id: string;
  household_id: string;
  username: string;
  display_name: string;
  password_hash: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
};

export const MAX_HOUSEHOLD_SIZE = 4;

export class UsernameTakenError extends Error {
  constructor() {
    super("Username is already taken.");
    this.name = "UsernameTakenError";
  }
}

export class HouseholdFullError extends Error {
  constructor() {
    super(`Household already has ${MAX_HOUSEHOLD_SIZE} members.`);
    this.name = "HouseholdFullError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid username or password.");
    this.name = "InvalidCredentialsError";
  }
}

function getSingleHousehold(db: DatabaseSyncInstance): { id: string; name: string } | null {
  const row = db
    .prepare("SELECT id, name FROM households LIMIT 1")
    .get() as { id: string; name: string } | undefined;
  return row ?? null;
}

function countHouseholdUsers(db: DatabaseSyncInstance, householdId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE household_id = ?")
    .get(householdId) as { count: number };
  return row.count;
}

export function getUserByUsername(
  db: DatabaseSyncInstance,
  username: string
): UserRecord | null {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRecord | undefined;
  return row ?? null;
}

export function getUserById(db: DatabaseSyncInstance, id: string): UserRecord | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRecord
    | undefined;
  return row ?? null;
}

/**
 * Signup rule for a single-household app: the first person to sign up
 * creates the household and becomes admin. Everyone after that joins the
 * same household as a member, up to MAX_HOUSEHOLD_SIZE.
 */
export async function signup(
  db: DatabaseSyncInstance,
  params: { username: string; displayName: string; password: string }
): Promise<UserRecord> {
  const { username, displayName, password } = params;

  if (getUserByUsername(db, username)) {
    throw new UsernameTakenError();
  }

  const passwordHash = await hashPassword(password);
  const userId = newId();

  let household = getSingleHousehold(db);
  let role: Role = "member";

  if (!household) {
    const householdId = newId();
    db.prepare("INSERT INTO households (id, name) VALUES (?, ?)").run(
      householdId,
      "Our Household"
    );
    household = { id: householdId, name: "Our Household" };
    role = "admin";
    seedFoodAndDishLibrary(db, householdId);
  } else {
    if (countHouseholdUsers(db, household.id) >= MAX_HOUSEHOLD_SIZE) {
      throw new HouseholdFullError();
    }
  }

  db.prepare(
    `INSERT INTO users (id, household_id, username, display_name, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, household.id, username, displayName, passwordHash, role);

  return getUserById(db, userId)!;
}

export async function login(
  db: DatabaseSyncInstance,
  params: { username: string; password: string }
): Promise<UserRecord> {
  const user = getUserByUsername(db, params.username);
  if (!user) {
    throw new InvalidCredentialsError();
  }
  const valid = await verifyPassword(params.password, user.password_hash);
  if (!valid) {
    throw new InvalidCredentialsError();
  }
  return user;
}
