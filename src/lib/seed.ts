import type { DatabaseSyncInstance } from "@/db";
import { newId } from "@/lib/ids";

export type FoodCategory = "base" | "dal_protein" | "vegetable" | "paneer" | "special";

const FOODS: { name: string; category: FoodCategory }[] = [
  // base
  { name: "Rice", category: "base" },
  { name: "Roti", category: "base" },
  // dal / protein / pulses
  { name: "Dal", category: "dal_protein" },
  { name: "Rajma", category: "dal_protein" },
  { name: "Chana", category: "dal_protein" },
  { name: "Kabuli Chana", category: "dal_protein" },
  { name: "Sprouts", category: "dal_protein" },
  { name: "Kadhi", category: "dal_protein" },
  // vegetables
  { name: "Eggplant", category: "vegetable" },
  { name: "Lauki", category: "vegetable" },
  { name: "Turai", category: "vegetable" },
  { name: "Mushroom", category: "vegetable" },
  { name: "Matar", category: "vegetable" },
  { name: "French Beans", category: "vegetable" },
  { name: "Palak", category: "vegetable" },
  { name: "Methi", category: "vegetable" },
  { name: "Kanduri", category: "vegetable" },
  { name: "Sweet Potato", category: "vegetable" },
  { name: "Chawli", category: "vegetable" },
  { name: "Drumstick", category: "vegetable" },
  // paneer
  { name: "Paneer", category: "paneer" },
];

// Each dish: name, ingredient food-names (looked up to ids), tags.
const DISHES: { name: string; ingredients: string[]; tags: string[] }[] = [
  // everyday
  { name: "Dal + Rice + Lauki", ingredients: ["Dal", "Rice", "Lauki"], tags: ["weekday"] },
  { name: "Dal + Roti + Turai", ingredients: ["Dal", "Roti", "Turai"], tags: ["weekday"] },
  { name: "French Beans Sabzi + Roti", ingredients: ["French Beans", "Roti"], tags: ["weekday"] },
  { name: "Dal + Rice", ingredients: ["Dal", "Rice"], tags: ["weekday"] },
  { name: "Dal + Roti", ingredients: ["Dal", "Roti"], tags: ["weekday"] },
  { name: "Mushroom Matar + Roti", ingredients: ["Mushroom", "Matar", "Roti"], tags: ["weekday"] },
  { name: "Methi Sabzi + Roti", ingredients: ["Methi", "Roti"], tags: ["weekday"] },
  { name: "Sweet Potato Sabzi + Roti", ingredients: ["Sweet Potato", "Roti"], tags: ["weekday"] },
  { name: "Chawli Sabzi + Roti", ingredients: ["Chawli", "Roti"], tags: ["weekday"] },
  { name: "Kanduri Sabzi + Roti", ingredients: ["Kanduri", "Roti"], tags: ["weekday"] },
  // pulses
  { name: "Rajma Chawal", ingredients: ["Rajma", "Rice"], tags: ["weekday"] },
  { name: "Rajma + Roti", ingredients: ["Rajma", "Roti"], tags: ["weekday"] },
  { name: "Chana Masala + Roti", ingredients: ["Chana", "Roti"], tags: ["weekday"] },
  { name: "Kabuli Chana + Rice", ingredients: ["Kabuli Chana", "Rice"], tags: ["weekday"] },
  { name: "Sprouts Usal + Roti", ingredients: ["Sprouts", "Roti"], tags: ["weekday"] },
  // paneer
  { name: "Palak Paneer + Roti", ingredients: ["Palak", "Paneer", "Roti"], tags: ["weekday"] },
  { name: "Matar Paneer + Roti", ingredients: ["Matar", "Paneer", "Roti"], tags: ["weekday"] },
  { name: "Paneer Bhurji + Roti", ingredients: ["Paneer", "Roti"], tags: ["weekday"] },
  // brinjal
  { name: "Baingan Bharta + Roti", ingredients: ["Eggplant", "Roti"], tags: ["weekday"] },
  { name: "Baingan Sabzi + Roti", ingredients: ["Eggplant", "Roti"], tags: ["weekday"] },
  // kadhi
  { name: "Kadhi + Rice", ingredients: ["Kadhi", "Rice"], tags: ["weekday"] },
  // drumstick / south-indian-ish
  { name: "Drumstick Sambar + Rice", ingredients: ["Drumstick", "Rice"], tags: ["weekday", "south_indian"] },
  // weekend specials
  { name: "Pav Bhaji", ingredients: ["Eggplant", "Matar"], tags: ["weekend_special"] },
  { name: "Chole Bhature", ingredients: ["Chana"], tags: ["weekend_special"] },
  { name: "Pulao", ingredients: ["Rice", "Matar"], tags: ["weekend_special"] },
  { name: "Dosa + Sambar", ingredients: ["Rice"], tags: ["weekend_special", "south_indian"] },
  { name: "Special Khichdi", ingredients: ["Rice", "Dal"], tags: ["weekend_special"] },
];

export function seedFoodAndDishLibrary(
  db: DatabaseSyncInstance,
  householdId: string
): void {
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM foods WHERE household_id = ?")
    .get(householdId) as { count: number };
  if (existing.count > 0) return; // already seeded

  const foodIdByName = new Map<string, string>();

  const insertFood = db.prepare(
    "INSERT INTO foods (id, household_id, name, category) VALUES (?, ?, ?, ?)"
  );
  for (const food of FOODS) {
    const id = newId();
    insertFood.run(id, householdId, food.name, food.category);
    foodIdByName.set(food.name, id);
  }

  const insertDish = db.prepare(
    "INSERT INTO dishes (id, household_id, name, ingredient_ids, tags) VALUES (?, ?, ?, ?, ?)"
  );
  for (const dish of DISHES) {
    const ingredientIds = dish.ingredients
      .map((n) => foodIdByName.get(n))
      .filter((id): id is string => Boolean(id));
    insertDish.run(
      newId(),
      householdId,
      dish.name,
      JSON.stringify(ingredientIds),
      JSON.stringify(dish.tags)
    );
  }
}
