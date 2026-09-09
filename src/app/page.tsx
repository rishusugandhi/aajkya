import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/db";
import { getUserById } from "@/lib/users";
import LogoutButton from "./logout-button";
import Dashboard from "./dashboard";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const user = getUserById(db, session.userId);
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh p-4 bg-neutral-50">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Hey, {user.display_name} 👋
          </h1>
          <LogoutButton />
        </div>
        <Dashboard currentUserId={user.id} />
      </div>
    </main>
  );
}
