"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MealCard, { type MealSummary } from "./meal-card";

function todayIso(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export default function Dashboard({ currentUserId }: { currentUserId: string }) {
  const [meals, setMeals] = useState<MealSummary[] | null>(null);
  const today = todayIso();
  const start = addDays(today, -3);

  const load = useCallback(async () => {
    const res = await fetch(`/api/meals?start=${start}&days=6`);
    const data = await res.json();
    setMeals(data.meals);
  }, [start]);

  useEffect(() => {
    load();
  }, [load]);

  if (!meals) {
    return <p className="text-sm text-neutral-400 p-6">Loading…</p>;
  }

  const byDate = (d: string) => meals.filter((m) => m.date === d);
  const todayMeals = byDate(today);
  const tomorrowMeals = byDate(addDays(today, 1));
  const pastDates = [addDays(today, -1), addDays(today, -2), addDays(today, -3)];

  function labelFor(offset: number): string {
    if (offset === -1) return "Yesterday";
    return `${Math.abs(offset)} days ago`;
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
          Today
        </h2>
        <div className="space-y-3">
          {todayMeals.map((m) => (
            <MealCard key={m.id} meal={m} currentUserId={currentUserId} onChanged={load} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
          Tomorrow
        </h2>
        <div className="space-y-2">
          {tomorrowMeals.map((m) => (
            <div
              key={m.id}
              className="text-sm bg-white rounded-xl px-3 py-2 flex justify-between"
            >
              <span className="text-neutral-500">
                {m.slot === "lunch" ? "Lunch" : "Dinner"}
              </span>
              <span className="font-medium">
                {m.isCookingOff ? "🛑 Cooking Off" : m.actualDishName ?? "TBD"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
          Recently Eaten
        </h2>
        <div className="space-y-1.5">
          {pastDates.map((d, i) => {
            const dayMeals = byDate(d);
            if (dayMeals.length === 0) return null;
            return (
              <div key={d} className="text-sm bg-white rounded-xl px-3 py-2">
                <p className="text-xs text-neutral-400">{labelFor(-(i + 1))}</p>
                {dayMeals.map((m) => (
                  <p key={m.id}>
                    <span className="text-neutral-500">
                      {m.slot === "lunch" ? "Lunch" : "Dinner"} →{" "}
                    </span>
                    <span className="font-medium">
                      {m.isCookingOff ? "🛑 Cooking Off" : m.actualDishName ?? "—"}
                    </span>
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href="/calendar"
          className="flex-1 text-center text-sm underline text-neutral-500 py-2"
        >
          View calendar →
        </Link>
        <Link
          href="/shopping"
          className="flex-1 text-center text-sm underline text-neutral-500 py-2"
        >
          Shopping list →
        </Link>
      </div>
    </div>
  );
}
