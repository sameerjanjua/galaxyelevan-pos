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

    const type = searchParams.get("type"); // DAMAGE, LOSS, FOUND, CORRECTION
    const userId = searchParams.get("userId");
    const requestedLocationId = searchParams.get("locationId");
    
    const locationFilter = resolveLocationFilter(user, requestedLocationId);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    const where = {
      tenantId: user.tenantId,
      type: { in: ["DAMAGE", "LOSS", "FOUND", "CORRECTION"] },
      ...locationFilter,
    };

    if (type) where.type = type;
    if (userId) where.createdBy = userId;

    const [adjustments, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // Aggregate statistics
    const stats = {
      totalAdjustments: total,
      byType: {},
      byUser: {},
      totalQuantityAdjusted: 0,
    };

    adjustments.forEach((adj) => {
      // Count by type
      stats.byType[adj.type] = (stats.byType[adj.type] || 0) + 1;

      // Count by user
      const userName = adj.user.fullName;
      if (!stats.byUser[userName]) {
        stats.byUser[userName] = { count: 0, totalQty: 0 };
      }
      stats.byUser[userName].count += 1;
      stats.byUser[userName].totalQty += adj.quantity;

      // Total quantity
      stats.totalQuantityAdjusted += adj.quantity;
    });

    return NextResponse.json(
      {
        success: true,
        adjustments: adjustments.map((adj) => ({
          id: adj.id,
          date: adj.createdAt,
          product: adj.product.name,
          sku: adj.product.sku,
          location: adj.location.name,
          type: adj.type,
          quantity: adj.quantity,
          notes: adj.notes,
          user: adj.user.fullName,
          email: adj.user.email,
        })),
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Adjustments report error:", error);
    return NextResponse.json(
      { error: "Failed to generate adjustments report" },
      { status: 500 }
    );
  }
}
