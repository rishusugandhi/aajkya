import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export type DatabaseSyncInstance = DatabaseSync;

const DB_PATH = path.join(process.cwd(), "data", "app.db");
const SCHEMA_PATH = path.join(process.cwd(), "src", "db", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __mealPlannerDb: DatabaseSyncInstance | undefined;
}

function createDb(): DatabaseSyncInstance {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  return db;
}

// Reuse a single connection across hot reloads in dev.
export const db: DatabaseSyncInstance = global.__mealPlannerDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  global.__mealPlannerDb = db;
}
