import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES, getLocationFilter } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const productId = searchParams.get("productId");

    // Build where clause - must filter through product relationship to get tenantId
    const where = {
      product: {
        tenantId: user.tenantId,
      },
      ...getLocationFilter(user),
    };

    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;

    // Get current stock levels
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

    // Add status based on low stock alert (Location Min overrides Product Global)
    const enrichedStocks = stocks.map((stock) => {
      const threshold = stock.minQuantity > 0 ? stock.minQuantity : (stock.product.lowStockAlert || 0);
      
      return {
        ...stock,
        status:
          stock.quantity <= threshold
            ? "CRITICAL"
            : stock.quantity <= threshold * 1.5
              ? "WARNING"
              : "OK",
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: enrichedStocks.length,
        stocks: enrichedStocks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get stock error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock levels", errorMessage: error.message },
      { status: 500 }
    );
  }
}
