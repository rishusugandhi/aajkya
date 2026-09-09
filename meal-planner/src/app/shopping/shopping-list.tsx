"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; category: string };

const CATEGORY_LABELS: Record<string, string> = {
  vegetable: "Vegetables",
  dal_protein: "Dal / Pulses",
  paneer: "Paneer",
  special: "Special",
};

export default function ShoppingList() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/shopping?days=3")
      .then((r) => r.json())
      .then((d) => setItems(d.items));
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!items) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (items.length === 0)
    return (
      <p className="text-sm text-neutral-400">
        Nothing to buy for the next 3 days.
      </p>
    );

  const byCategory = new Map<string, Item[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div className="space-y-4">
      {[...byCategory.entries()].map(([cat, catItems]) => (
        <div key={cat} className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
            {CATEGORY_LABELS[cat] ?? cat}
          </p>
          <div className="space-y-1.5">
            {catItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="w-4 h-4"
                />
                <span className={checked.has(item.id) ? "line-through text-neutral-400" : ""}>
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
