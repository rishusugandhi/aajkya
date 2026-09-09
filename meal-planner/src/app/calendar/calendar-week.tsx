"use client";

import { useCallback, useEffect, useState } from "react";
import MealCard, { type MealSummary } from "../meal-card";

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

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function CalendarWeek({ currentUserId }: { currentUserId: string }) {
  const [weekStart, setWeekStart] = useState(todayIso());
  const [meals, setMeals] = useState<MealSummary[] | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(todayIso());

  const load = useCallback(async () => {
    const res = await fetch(`/api/meals?start=${weekStart}&days=7`);
    const data = await res.json();
    setMeals(data.meals);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="text-sm underline text-neutral-500"
        >
          ← Prev week
        </button>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="text-sm underline text-neutral-500"
        >
          Next week →
        </button>
      </div>

      {!meals && <p className="text-sm text-neutral-400">Loading…</p>}

      {meals &&
        days.map((d) => {
          const dayMeals = meals.filter((m) => m.date === d);
          const isSunday = new Date(d + "T00:00:00Z").getUTCDay() === 0;
          const isToday = d === todayIso();
          const expanded = expandedDate === d;
          return (
            <div
              key={d}
              className={`rounded-2xl p-3 ${
                isSunday ? "bg-neutral-200" : "bg-white shadow-sm"
              }`}
            >
              <button
                onClick={() => setExpandedDate(expanded ? null : d)}
                className="w-full flex items-center justify-between"
              >
                <span
                  className={`text-sm font-medium ${
                    isToday ? "text-neutral-900" : "text-neutral-600"
                  }`}
                >
                  {formatDateLabel(d)} {isToday && "· Today"}
                </span>
                {isSunday ? (
                  <span className="text-xs text-neutral-500">🛑 Cooking Off</span>
                ) : (
                  <span className="text-xs text-neutral-400">
                    {expanded ? "▲" : "▼"}
                  </span>
                )}
              </button>

              {!expanded && !isSunday && (
                <div className="mt-1 text-xs text-neutral-500 space-y-0.5">
                  {dayMeals.map((m) => (
                    <p key={m.id}>
                      {m.slot === "lunch" ? "Lunch" : "Dinner"}:{" "}
                      {m.actualDishName ?? "TBD"}
                    </p>
                  ))}
                </div>
              )}

              {expanded && !isSunday && (
                <div className="mt-3 space-y-3">
                  {dayMeals.map((m) => (
                    <MealCard
                      key={m.id}
                      meal={m}
                      currentUserId={currentUserId}
                      onChanged={load}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
