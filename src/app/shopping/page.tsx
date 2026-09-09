import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import ShoppingList from "./shopping-list";

export default async function ShoppingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect("/login");

  return (
    <main className="min-h-dvh p-4 bg-neutral-50">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Shopping List</h1>
          <a href="/" className="text-sm underline text-neutral-500">
            ← Today
          </a>
        </div>
        <p className="text-sm text-neutral-500">
          Derived from the next 3 days of planned meals. Rice and roti are
          assumed pantry staples and left off.
        </p>
        <ShoppingList />
      </div>
    </main>
  );
}
