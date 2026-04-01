import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import LogoutClient from "./LogoutClient";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await requireUser();

  // Fetch tenant to check if suspended
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { isSuspended: true, name: true },
  });

  // Filter by location for non-OWNER roles
  const whereClause = { tenantId: user.tenantId };
  if (user.role === "MANAGER" || user.role === "STAFF") {
    if (user.locationId) {
      whereClause.locationId = user.locationId;
    }
  }

  const [totals, recentSales] = await Promise.all([
    prisma.sale.aggregate({
      where: whereClause,
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        createdAt: true,
        customer: { select: { name: true } },
        location: { select: { name: true } },
      },
    }),
  ]);

  // Convert Prisma Decimals to plain numbers before passing to client component
  const totalRevenue = Number(totals._sum.total ?? 0);
  const totalSales = totals._count;
  const serializedRecentSales = recentSales.map((s) => ({
    ...s,
    total: Number(s.total),
    createdAt: s.createdAt.toISOString(),
  }));

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
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium"
            >
              Overview
            </Link>
            <Link
              href="/pos"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              POS
            </Link>
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <>
                <Link
                  href="/products"
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Products
                </Link>
                <Link
                  href="/customers"
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Customers
                </Link>
                <Link
                  href="/reports"
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Reports
                </Link>
                <Link
                  href="/inventory"
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Inventory
                </Link>
              </>
            )}
            {(user.role === 'OWNER' || user.role === 'MANAGER') && (
              <Link
                href="/settings/users"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Team
              </Link>
            )}
          </nav>
          <div>
            <LogoutClient />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {/* Suspension Notice */}
        {tenant?.isSuspended && (
          <div className="mb-6 rounded-lg border border-red-700 bg-red-900/20 p-4 text-red-200">
            <div className="flex items-start gap-3">
              <div className="text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold"><strong>{tenant.name}</strong> account is suspended</h3>
                <p className="mt-1 text-sm">
                  Your business account has been suspended. You cannot perform any transactions. Please contact support to restore access.
                </p>
              </div>
            </div>
          </div>
        )}

        <DashboardClient
          initialRecentSales={serializedRecentSales}
          initialTotalRevenue={totalRevenue}
          initialTotalSales={totalSales}
          tenantId={user.tenantId}
          locationId={whereClause.locationId}
          user={user}
        />
      </main>
    </div>
  );
}

