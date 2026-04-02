import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function POST(req) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const body = await req.json();
    const { productId, locationId, minQuantity } = body;

    if (!productId || !locationId || minQuantity === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: productId, locationId, minQuantity" },
        { status: 400 }
      );
    }

    // Verify product and location belong to the same tenant
    const [product, location] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId }, select: { tenantId: true } }),
      prisma.location.findUnique({ where: { id: locationId }, select: { tenantId: true } }),
    ]);

    if (!product || product.tenantId !== user.tenantId || !location || location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Product or Location not found" },
        { status: 404 }
      );
    }

    // Managers can only update for their assigned location
    if (user.role === ROLES.MANAGER && user.locationId !== locationId) {
      return NextResponse.json(
        { error: "Access denied: managers can only update their own location" },
        { status: 403 }
      );
    }

    // Upsert the stock record to set minQuantity
    const stock = await prisma.stock.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      update: {
        minQuantity: parseInt(minQuantity) || 0,
      },
      create: {
        productId,
        locationId,
        minQuantity: parseInt(minQuantity) || 0,
        quantity: 0, // Initial quantity 0 if creating new
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Minimum stock level updated",
        stock,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update min-quantity error:", error);
    return NextResponse.json(
      { error: "Failed to update minimum stock level" },
      { status: 500 }
    );
  }
}
