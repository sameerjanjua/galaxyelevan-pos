import { ApprovalsClient } from "@/components/tenant/approvals/ApprovalsClient";
import { requireUser, ROLES, hasRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ApprovalsPage() {
  const user = await requireUser();

  // Guard: Only Owners and Managers
  if (!hasRole(user, [ROLES.OWNER, ROLES.MANAGER])) {
    redirect("/dashboard");
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-white tracking-tight">Approvals & Overrides</h1>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
           Live Authorization Queue & Audit History
        </p>
      </div>

      <ApprovalsClient user={user} />
    </div>
  );
}
