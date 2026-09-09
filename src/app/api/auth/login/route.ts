import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { login, InvalidCredentialsError } from "@/lib/users";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as Record<string, unknown>;

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "username and password are required." },
      { status: 400 }
    );
  }

  try {
    const user = await login(db, { username: username.trim(), password });

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
    if (err instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
