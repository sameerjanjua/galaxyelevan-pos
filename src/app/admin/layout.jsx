import { redirect } from "next/navigation";
import { AdminNavbar } from "@/components/admin/navbar/AdminNavbar";
import { AdminSidebar } from "@/components/admin/sidebar/AdminSidebar";
import { clearSuperAdminSession, requireSuperAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }) {
  const user = await requireSuperAdmin();

  async function logoutAction() {
    "use server";
    await clearSuperAdminSession();
    redirect("/auth/admin-login");
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminSidebar />

      <main className="ml-64">
        <AdminNavbar userName={user?.fullName} onLogout={logoutAction} />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
