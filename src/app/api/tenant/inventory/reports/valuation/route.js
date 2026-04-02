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

    const requestedLocationId = searchParams.get("locationId");
    const categoryId = searchParams.get("categoryId");

    const locationFilter = resolveLocationFilter(user, requestedLocationId);

    // Get all stocks with product details
    const where = {
      product: {
        tenantId: user.tenantId,
        ...(categoryId && { categoryId }),
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
            costPrice: true,
            category: { select: { id: true, name: true } },
          },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    // Calculate valuations
    let totalValue = 0;
    const byLocation = {};
    const byCategory = {};
    const products = [];

    stocks.forEach((stock) => {
      const qty = Number(stock.quantity);
      const costPrice = Number(stock.product.costPrice || 0);
      const itemValue = qty * costPrice;
      totalValue += itemValue;

      // By product
      products.push({
        id: stock.product.id,
        name: stock.product.name,
        sku: stock.product.sku,
        quantity: qty,
        costPrice: Number(stock.product.costPrice || 0),
        value: itemValue,
        category: stock.product.category?.name || "Uncategorized",
        location: stock.location.name,
      });

      // By location
      if (!byLocation[stock.location.id]) {
        byLocation[stock.location.id] = {
          name: stock.location.name,
          value: 0,
          qty: 0,
        };
      }
      byLocation[stock.location.id].value += itemValue;
      byLocation[stock.location.id].qty += qty;

      // By category
      const catName = stock.product.category?.name || "Uncategorized";
      if (!byCategory[catName]) {
        byCategory[catName] = { name: catName, value: 0, qty: 0 };
      }
      byCategory[catName].value += itemValue;
      byCategory[catName].qty += qty;
    });

    // Top 10 most valuable products
    const topProducts = products
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalValue,
          totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
          totalProducts: products.length,
          averageUnitValue: totalValue / Math.max(products.length, 1),
        },
        byLocation: Object.values(byLocation),
        byCategory: Object.values(byCategory),
        topProducts,
        allProducts: products,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stock valuation error:", error);
    return NextResponse.json(
      { error: "Failed to generate valuation report" },
      { status: 500 }
    );
  }
}
