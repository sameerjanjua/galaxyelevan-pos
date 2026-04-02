import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";
import { resolveLocationFilter } from "@/lib/resolveLocationFilter";

export async function GET(req) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);

    const days = parseInt(searchParams.get("days") || "90", 10);
    const requestedLocationId = searchParams.get("locationId");
    const locationFilter = resolveLocationFilter(user, requestedLocationId);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all products for tenant
    const products = await prisma.product.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true, sku: true, salePrice: true },
    });

    const where = {
      tenantId: user.tenantId,
      type: "SALE",
      createdAt: { gte: startDate },
      ...locationFilter,
    };

    // Get sales movements for the period
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, salePrice: true },
        },
      },
    });

    // Analyze movements
    const analysis = {};
    let totalSalesQty = 0;
    let totalSalesRevenue = 0;

    products.forEach((p) => {
      analysis[p.id] = {
        id: p.id,
        name: p.name,
        sku: p.sku,
        salePrice: Number(p.salePrice || 0),
        salesQty: 0,
        salesRevenue: 0,
        lastSaleDate: null,
      };
    });

    movements.forEach((m) => {
      const qty = Math.abs(m.quantity);
      const revenue = qty * Number(m.product.salePrice || 0);

      analysis[m.productId].salesQty += qty;
      analysis[m.productId].salesRevenue += revenue;
      analysis[m.productId].lastSaleDate = new Date(m.createdAt);

      totalSalesQty += qty;
      totalSalesRevenue += revenue;
    });

    // Categorize movement patterns
    const avgSalesQty =
      totalSalesQty > 0 ? totalSalesQty / products.length : 0;

    const fastMoving = [];
    const slowMoving = [];
    const deadStock = [];

    Object.values(analysis).forEach((item) => {
      if (item.salesQty === 0) {
        deadStock.push({
          ...item,
          status: "Dead Stock",
          daysNoSales: days,
        });
      } else if (item.salesQty > avgSalesQty * 1.5) {
        fastMoving.push({
          ...item,
          status: "Fast Moving",
          turnoverRate: (item.salesQty / days * 30).toFixed(2), // Monthly rate
        });
      } else if (item.salesQty > 0 && item.salesQty < avgSalesQty * 0.5) {
        slowMoving.push({
          ...item,
          status: "Slow Moving",
          turnoverRate: (item.salesQty / days * 30).toFixed(2), // Monthly rate
        });
      }
    });

    // Sort by sales quantity
    fastMoving.sort((a, b) => b.salesQty - a.salesQty);
    slowMoving.sort((a, b) => b.salesQty - a.salesQty);

    return NextResponse.json(
      {
        success: true,
        period: { days, startDate, endDate: new Date() },
        summary: {
          totalProducts: products.length,
          fastMovingCount: fastMoving.length,
          slowMovingCount: slowMoving.length,
          deadStockCount: deadStock.length,
          totalSalesQty,
          totalSalesRevenue: totalSalesRevenue.toFixed(2),
          averageSalesQty: avgSalesQty.toFixed(2),
        },
        fastMoving: fastMoving.slice(0, 20),
        slowMoving: slowMoving.slice(0, 20),
        deadStock: deadStock.slice(0, 20),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Movement analysis error:", error);
    return NextResponse.json(
      { error: "Failed to generate movement analysis" },
      { status: 500 }
    );
  }
}
