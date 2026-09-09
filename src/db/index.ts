import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export type DatabaseSyncInstance = DatabaseSync;

const DB_PATH = path.join(process.cwd(), "data", "app.db");
const SCHEMA_PATH = path.join(process.cwd(), "src", "db", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __mealPlannerDb: DatabaseSync | undefined;
}

function createDb(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const instance = new DatabaseSync(DB_PATH);
  instance.exec("PRAGMA foreign_keys = ON;");
  instance.exec("PRAGMA busy_timeout = 5000;");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  instance.exec(schema);
  return instance;
}

function getDb(): DatabaseSync {
  if (!global.__mealPlannerDb) {
    global.__mealPlannerDb = createDb();
  }
  return global.__mealPlannerDb;
}

export const db: DatabaseSyncInstance = new Proxy({} as DatabaseSyncInstance, {
  get(_target, prop, _receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
