-- Meal Planner schema. Single household in v1, but everything is scoped
-- by household_id so it's not a rewrite later.

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','member')) DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('base','dal_protein','vegetable','paneer','special')),
  is_approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(household_id, name)
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  ingredient_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of food ids
  tags TEXT NOT NULL DEFAULT '[]',           -- JSON array of tag strings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(household_id, name)
);

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  date TEXT NOT NULL,             -- 'YYYY-MM-DD', household-local
  slot TEXT NOT NULL CHECK (slot IN ('lunch','dinner')),
  planned_dish_id TEXT REFERENCES dishes(id),
  actual_dish_id TEXT REFERENCES dishes(id),
  is_cooking_off INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(household_id, date, slot)
);

CREATE TABLE IF NOT EXISTS meal_changes (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id),
  from_dish_id TEXT REFERENCES dishes(id),
  to_dish_id TEXT REFERENCES dishes(id),
  changed_by_user_id TEXT NOT NULL REFERENCES users(id),
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('eating','not_eating','unset')) DEFAULT 'unset',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(meal_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  food_id TEXT NOT NULL REFERENCES foods(id),
  needed_for_date TEXT NOT NULL,
  is_checked INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_meals_household_date ON meals(household_id, date);
CREATE INDEX IF NOT EXISTS idx_comments_meal ON comments(meal_id);
