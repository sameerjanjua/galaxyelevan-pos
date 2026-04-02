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

    const status = searchParams.get("status"); // CRITICAL, WARNING, or ALL
    const requestedLocationId = searchParams.get("locationId");
    const locationFilter = resolveLocationFilter(user, requestedLocationId);

    const where = {
      product: {
        tenantId: user.tenantId,
      },
      ...locationFilter,
    };

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            trackStock: true,
            lowStockAlert: true,
            costPrice: true,
            salePrice: true,
            supplierId: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Filter for low stock items
    const lowStockItems = stocks
      .filter((stock) => {
        const threshold = stock.minQuantity > 0 ? stock.minQuantity : (stock.product.lowStockAlert || 0);
        return threshold > 0 && stock.quantity <= threshold * 1.5; // Include both CRITICAL and WARNING
      })
      .map((stock) => {
        const threshold = stock.minQuantity > 0 ? stock.minQuantity : (stock.product.lowStockAlert || 0);
        const isCritical = stock.quantity <= threshold;

        return {
          stock: {
            ...stock,
            product: {
              ...stock.product,
              costPrice: Number(stock.product.costPrice || 0),
              salePrice: Number(stock.product.salePrice || 0),
            },
          },
          status: isCritical ? "CRITICAL" : "WARNING",
          stockLevel: stock.quantity,
          threshold,
          valueAtRisk: stock.quantity * Number(stock.product.costPrice || 0),
        };
      })
      .filter((item) => {
        if (!status || status === "ALL") return true;
        return item.status === status;
      });

    // Summary stats
    const criticalCount = lowStockItems.filter((i) => i.status === "CRITICAL")
      .length;
    const warningCount = lowStockItems.filter((i) => i.status === "WARNING")
      .length;
    const totalValueAtRisk = lowStockItems.reduce(
      (sum, item) => sum + item.valueAtRisk,
      0
    );

    return NextResponse.json(
      {
        success: true,
        summary: {
          criticalCount,
          warningCount,
          totalAtRisk: lowStockItems.length,
          totalValueAtRisk,
        },
        alerts: lowStockItems,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get low stock alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock alerts", errorMessage: error.message },
      { status: 500 }
    );
  }
}
