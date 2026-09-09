"use client";

import { useState } from "react";

export type AttendanceRow = {
  user_id: string;
  display_name: string;
  status: "eating" | "not_eating" | "unset";
};

export type MealSummary = {
  id: string;
  date: string;
  slot: "lunch" | "dinner";
  isCookingOff: boolean;
  plannedDishName: string | null;
  actualDishName: string | null;
  attendance: AttendanceRow[];
  eatingCount: number;
  totalMembers: number;
  commentCount: number;
};

type Dish = { id: string; name: string; tags: string[] };

export default function MealCard({
  meal,
  currentUserId,
  onChanged,
}: {
  meal: MealSummary;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<
    { id: string; body: string; display_name: string; created_at: string }[] | null
  >(null);
  const [commentText, setCommentText] = useState("");
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const myStatus =
    meal.attendance.find((a) => a.user_id === currentUserId)?.status ?? "unset";

  async function markAttendance(status: "eating" | "not_eating") {
    setBusy(true);
    try {
      await fetch(`/api/meals/${meal.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function loadComments() {
    const res = await fetch(`/api/meals/${meal.id}`);
    const data = await res.json();
    setComments(data.meal.comments);
  }

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && comments === null) await loadComments();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/meals/${meal.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json();
      setComments(data.comments);
      setCommentText("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function openEdit() {
    setEditing(true);
    if (!dishes) {
      const res = await fetch("/api/dishes");
      const data = await res.json();
      setDishes(data.dishes);
    }
  }

  async function pickDish(dishId: string) {
    setBusy(true);
    try {
      await fetch(`/api/meals/${meal.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishId }),
      });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (meal.isCookingOff) {
    return (
      <div className="rounded-2xl bg-neutral-100 p-4 text-center text-neutral-500">
        🛑 Cooking Off — {meal.slot === "lunch" ? "Lunch" : "Dinner"}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            {meal.slot === "lunch" ? "🍛 Lunch" : "🍽️ Dinner"}
          </p>
          <p className="font-medium">{meal.actualDishName ?? "Not yet planned"}</p>
          {meal.plannedDishName &&
            meal.actualDishName &&
            meal.plannedDishName !== meal.actualDishName && (
              <p className="text-xs text-neutral-400">
                originally planned: {meal.plannedDishName}
              </p>
            )}
        </div>
        <button
          onClick={openEdit}
          className="text-xs text-neutral-500 underline shrink-0"
        >
          Edit
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          👥 {meal.eatingCount}/{meal.totalMembers} eating
        </p>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => markAttendance("eating")}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              myStatus === "eating"
                ? "bg-green-600 text-white border-green-600"
                : "border-neutral-300"
            }`}
          >
            I&apos;m Eating
          </button>
          <button
            disabled={busy}
            onClick={() => markAttendance("not_eating")}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              myStatus === "not_eating"
                ? "bg-neutral-800 text-white border-neutral-800"
                : "border-neutral-300"
            }`}
          >
            Not Eating
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {meal.attendance.map((a) => (
          <span
            key={a.user_id}
            className={`text-xs px-2 py-0.5 rounded-full ${
              a.status === "eating"
                ? "bg-green-50 text-green-700"
                : a.status === "not_eating"
                ? "bg-neutral-100 text-neutral-400"
                : "bg-neutral-50 text-neutral-300"
            }`}
          >
            {a.display_name} {a.status === "eating" ? "✓" : a.status === "not_eating" ? "✗" : "—"}
          </span>
        ))}
      </div>

      {editing && (
        <div className="border-t pt-3 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-xs text-neutral-400 mb-1">Pick a dish:</p>
          {dishes === null && <p className="text-xs text-neutral-400">Loading…</p>}
          {dishes?.map((d) => (
            <button
              key={d.id}
              onClick={() => pickDish(d.id)}
              className="block w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-neutral-50"
            >
              {d.name}
            </button>
          ))}
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-neutral-400 underline"
          >
            Cancel
          </button>
        </div>
      )}

      <button
        onClick={toggleExpand}
        className="text-xs text-neutral-500 underline"
      >
        💬 {meal.commentCount} comment{meal.commentCount === 1 ? "" : "s"}
      </button>

      {expanded && (
        <div className="border-t pt-3 space-y-2">
          {comments?.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.display_name}: </span>
              <span className="text-neutral-600">{c.body}</span>
            </div>
          ))}
          {comments?.length === 0 && (
            <p className="text-xs text-neutral-400">No comments yet.</p>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
            />
            <button
              disabled={busy}
              type="submit"
              className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
