import { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/db";
import { getUserById, type UserRecord } from "@/lib/users";

export async function getCurrentUser(
  req: NextRequest
): Promise<UserRecord | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return getUserById(db, session.userId);
}

export function todayInHouseholdTz(): string {
  // Household-local date. For v1 we run everything in IST (household is
  // in Bengaluru); this avoids UTC boundary bugs around midnight.
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
