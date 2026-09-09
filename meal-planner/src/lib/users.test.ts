import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync, type DatabaseSyncInstance } from "@/db/sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  signup,
  login,
  UsernameTakenError,
  HouseholdFullError,
  InvalidCredentialsError,
  MAX_HOUSEHOLD_SIZE,
} from "@/lib/users";

function freshDb(): DatabaseSyncInstance {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "db", "schema.sql"),
    "utf-8"
  );
  db.exec(schema);
  return db;
}

describe("signup", () => {
  let db: DatabaseSyncInstance;

  beforeEach(() => {
    db = freshDb();
  });

  it("first signup creates the household and becomes admin", async () => {
    const user = await signup(db, {
      username: "rishu",
      displayName: "Rishu",
      password: "password123",
    });
    expect(user.role).toBe("admin");
    expect(user.household_id).toBeTruthy();
  });

  it("second signup joins the same household as a member", async () => {
    const first = await signup(db, {
      username: "rishu",
      displayName: "Rishu",
      password: "password123",
    });
    const second = await signup(db, {
      username: "aman",
      displayName: "Aman",
      password: "password123",
    });
    expect(second.role).toBe("member");
    expect(second.household_id).toBe(first.household_id);
  });

  it(`rejects a ${MAX_HOUSEHOLD_SIZE + 1}th signup with HouseholdFullError`, async () => {
    for (const name of ["rishu", "aman", "rahul", "vikas"]) {
      await signup(db, {
        username: name,
        displayName: name,
        password: "password123",
      });
    }
    await expect(
      signup(db, {
        username: "fifth",
        displayName: "Fifth",
        password: "password123",
      })
    ).rejects.toBeInstanceOf(HouseholdFullError);
  });

  it("rejects a duplicate username with UsernameTakenError", async () => {
    await signup(db, {
      username: "rishu",
      displayName: "Rishu",
      password: "password123",
    });
    await expect(
      signup(db, {
        username: "rishu",
        displayName: "Someone Else",
        password: "password456",
      })
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });

  it("stores a bcrypt hash, never the plaintext password", async () => {
    const user = await signup(db, {
      username: "rishu",
      displayName: "Rishu",
      password: "password123",
    });
    expect(user.password_hash).not.toBe("password123");
    expect(user.password_hash.startsWith("$2")).toBe(true);
  });
});

describe("login", () => {
  let db: DatabaseSyncInstance;

  beforeEach(async () => {
    db = freshDb();
    await signup(db, {
      username: "rishu",
      displayName: "Rishu",
      password: "password123",
    });
  });

  it("succeeds with correct credentials", async () => {
    const user = await login(db, { username: "rishu", password: "password123" });
    expect(user.username).toBe("rishu");
  });

  it("fails with wrong password", async () => {
    await expect(
      login(db, { username: "rishu", password: "wrongpassword" })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("fails for a nonexistent user", async () => {
    await expect(
      login(db, { username: "ghost", password: "password123" })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
