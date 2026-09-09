import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  signup,
  UsernameTakenError,
  HouseholdFullError,
} from "@/lib/users";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { username, displayName, password } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof username !== "string" ||
    typeof displayName !== "string" ||
    typeof password !== "string" ||
    username.trim().length < 3 ||
    displayName.trim().length < 1 ||
    password.length < 6
  ) {
    return NextResponse.json(
      {
        error:
          "username (min 3 chars), displayName, and password (min 6 chars) are required.",
      },
      { status: 400 }
    );
  }

  try {
    const user = await signup(db, {
      username: username.trim(),
      displayName: displayName.trim(),
      password,
    });

    const token = await createSessionToken({
      userId: user.id,
      householdId: user.household_id,
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof HouseholdFullError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
