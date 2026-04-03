import { Suspense } from "react";
import AdminLoginClient from "@/components/auth/admin-login/AdminLoginClient";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Login - POS Shop",
  description: "Platform administrator login",
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
   if (user && user.isSuperAdmin) {
    redirect("/admin");
  }
  else if (user && !user.isSuperAdmin) {
    redirect(`/${user.tenantSlug}/dashboard`);
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>}>
      <AdminLoginClient />
    </Suspense>
  );
}
