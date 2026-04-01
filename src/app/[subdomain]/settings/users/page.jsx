import { requireUser, getLocationFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UsersClient } from "./UsersClient";
import LogoutClient from "@/app/[subdomain]/dashboard/LogoutClient";

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role === "STAFF") {
    redirect("/dashboard");
  }

  const locationFilter = getLocationFilter(user);
  const where = { 
    tenantId: user.tenantId,
    ...locationFilter 
  };

  // Non-owners should not see the OWNER
  if (user.role !== "OWNER") {
    where.role = { not: "OWNER" };
  }

  // Fetch initial users
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      locationId: true,
      location: {
        select: { id: true, name: true }
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch locations for assignment dropdown
  const locations = await prisma.location.findMany({
    where: { 
      tenantId: user.tenantId,
      ...(locationFilter.locationId ? { id: locationFilter.locationId } : {})
    },
    select: { id: true, name: true }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white text-sm"
            >
              ← Dashboard
            </Link>
            <h1 className="text-lg font-semibold">User Management</h1>
          </div>
          <div>
            <LogoutClient />
          </div>
        </div>
      </header>
      
      <main className="mx-auto max-w-6xl px-6 py-8">
        <UsersClient initialUsers={users} locations={locations} currentUserRole={user.role} currentUserId={user.id} />
      </main>
    </div>
  );
}
