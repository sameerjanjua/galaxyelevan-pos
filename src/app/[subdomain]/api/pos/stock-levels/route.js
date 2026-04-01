import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    // Optional: filter by specific product IDs
    const productIds = searchParams.getAll("productIds");

    // Optional: accept locationId from request (for admin location switching)
    const requestedLocationId = searchParams.get("locationId");

    // Get user's location (assigned location or first location for tenant)
    let userLocation;

    // If locationId is provided and user is admin, use it
    if (requestedLocationId) {
      userLocation = await prisma.location.findFirst({
        where: {
          tenantId: user.tenantId,
          id: requestedLocationId,
        },
        select: { id: true },
      });
    } else if (user.locationId) {
      userLocation = await prisma.location.findUnique({
        where: { id: user.locationId },
        select: { id: true },
      });
    } else {
      userLocation = await prisma.location.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!userLocation) {
      return NextResponse.json(
        { error: "No location configured" },
        { status: 400 }
      );
    }

    const where = {
      tenantId: user.tenantId,
      isActive: true,
    };

    if (productIds.length > 0) {
      where.id = { in: productIds };
    }

    // Get products with stock for user's location ONLY
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        salePrice: true,
        lowStockAlert: true,
        trackStock: true,
        stocks: {
          where: { locationId: userLocation.id },
          select: {
            quantity: true,
            minQuantity: true,
            locationId: true,
          },
        },
      },
    });

    // Enrich with stock summary for current location only
    const enriched = products.map((p) => {
      const locationStock = p.stocks[0]; // There should be 0 or 1 stock record per product per location
      const quantity = locationStock?.quantity ?? 0;
      const threshold = locationStock?.minQuantity > 0 ? locationStock.minQuantity : (p.lowStockAlert || 0);
      const isLowStock = p.trackStock && threshold > 0 && quantity <= threshold;
      const isCritical = p.trackStock && threshold > 0 && quantity <= Math.ceil(threshold * 0.5);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        salePrice: Number(p.salePrice),
        totalStock: quantity,
        isLowStock,
        isCritical,
        trackStock: p.trackStock,
        lowStockAlert: threshold,
        locationId: userLocation.id,
      };
    });

    return NextResponse.json(
      {
        success: true,
        products: enriched,
        locationId: userLocation.id,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, must-revalidate",
          "X-Refresh-At": new Date(Date.now() + 5000).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("Real-time stock error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock levels" },
      { status: 500 }
    );
  }
}
