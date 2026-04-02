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

    const [recentSales, topProducts] = await Promise.all([
      prisma.sale.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: {
          sale: whereClause,
        },
        orderBy: {
          _sum: { quantity: "desc" },
        },
        take: 5,
      }),
    ]);

    // Get product names for top products
    const productIds = topProducts.map((p) => p.productId);
    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
        : [];

    // Build daily revenue map
    const dailyMap = new Map();
    for (const sale of recentSales) {
      const d = new Date(sale.createdAt);
      const key = d.toISOString().slice(0, 10);
      const existing = dailyMap.get(key) ?? { date: key, total: 0, count: 0 };
      existing.total += Number(sale.total);
      existing.count += 1;
      dailyMap.set(key, existing);
    }

    const daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Enrich top products with names
    const enrichedTopProducts = topProducts.map((p) => {
      const product = products.find((pr) => pr.id === p.productId);
      return {
        productId: p.productId,
        name: product?.name ?? p.productId,
        totalSold: p._sum.quantity ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      daily,
      topProducts: enrichedTopProducts,
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
