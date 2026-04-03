import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutClient from "@/components/auth/logout/LogoutClient";
import { DashboardClient } from "@/components/tenant/dashboard/DashboardClient";

export default async function DashboardPage() {
  const user = await requireUser();

  // Just render the shell — DashboardClient fetches data based on sidebar location
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">POS Dashboard</h1>
            <p className="text-xs text-slate-400">
              Welcome back, {user.fullName}
            </p>
          </div>
          <div>
            <LogoutClient />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <DashboardClient user={user} />
      </main>
    </div>
  );
}
