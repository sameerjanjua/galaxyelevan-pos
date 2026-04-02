import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { resolveLocationFilter } from "@/lib/resolveLocationFilter";

export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const requestedLocationId = searchParams.get("locationId");

    const locationFilter = resolveLocationFilter(user, requestedLocationId);

    const whereClause = {
      tenantId: user.tenantId,
      ...locationFilter,
    };

    const [totals, recentSales, tenant] = await Promise.all([
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
      prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isSuspended: true, name: true },
      }),
    ]);

    const totalRevenue = Number(totals._sum.total ?? 0);
    const totalSales = totals._count;
    const serializedRecentSales = recentSales.map((s) => ({
      ...s,
      total: Number(s.total),
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      totalRevenue,
      totalSales,
      recentSales: serializedRecentSales,
      tenant: tenant ? { isSuspended: tenant.isSuspended, name: tenant.name } : null,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
