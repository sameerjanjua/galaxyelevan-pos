import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";
import {
  emitToInventory,
  emitToPos,
  emitToLocation,
  getSocketIoInstance,
} from "@/lib/socket-io.server";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export async function POST(req) {
  try {
    const user = await requireUser();

    // Require OWNER or MANAGER role for stock adjustments
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const body = await req.json();

    const { productId, locationId, quantity, type, notes } = body;

    // Validate input
    if (!productId || !locationId || quantity === undefined || !type) {
      return NextResponse.json(
        { error: "Missing required fields: productId, locationId, quantity, type" },
        { status: 400 }
      );
    }

    if (!["DAMAGE", "LOSS", "FOUND", "CORRECTION"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid adjustment type" },
        { status: 400 }
      );
    }

    // Verify product and location exist
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, tenantId: true, trackStock: true },
    });

    if (!product || product.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, tenantId: true },
    });

    if (!location || location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Role-based location restriction
    if (user.role !== ROLES.OWNER && user.locationId !== locationId) {
      return NextResponse.json(
        { error: "Access denied: you can only adjust stock for your assigned location" },
        { status: 403 }
      );
    }

    // Get current stock
    const currentStock = await prisma.stock.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    const currentQty = currentStock?.quantity ?? 0;
    const newQty = currentQty + quantity;

    // Create adjustment within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create StockMovement for audit
      const movement = await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          productId,
          locationId,
          type,
          quantity,
          reference: null,
          notes,
          batchNumber: null,
          createdBy: user.id,
        },
      });

      // Update or create Stock
      let updatedStock;
      if (currentStock) {
        updatedStock = await tx.stock.update({
          where: { id: currentStock.id },
          data: { quantity: newQty },
        });
      } else {
        updatedStock = await tx.stock.create({
          data: {
            productId,
            locationId,
            quantity: newQty,
            minQuantity: 0,
          },
        });
      }

      return {
        movement,
        stock: updatedStock,
      };
    });

    // Emit Socket.io events for real-time updates
    const io = getSocketIoInstance();

    if (io) {
      emitToInventory(io, user.tenantId, SOCKET_EVENTS.STOCK_UPDATED, {
        productId,
        productName: product.name,
        quantity,
        type,
        locationId,
        previousQty: currentQty,
        newQty: newQty,
      });

      // Check if stock is now low/critical for alerts
      const threshold = result.stock.minQuantity > 0 ? result.stock.minQuantity : (product.lowStockAlert || 0);
      
      if (product.trackStock && threshold > 0 && newQty <= threshold) {
        emitToInventory(
          io,
          user.tenantId,
          SOCKET_EVENTS.LOW_STOCK_ALERT,
          {
            productId,
            productName: product.name,
            currentQty: newQty,
            threshold: threshold,
            locationId,
          }
        );
      }

      emitToPos(io, locationId, SOCKET_EVENTS.PRODUCT_STOCK_CHANGED, {
        productId,
        quantity,
      });

      emitToLocation(io, locationId, SOCKET_EVENTS.STOCK_MOVEMENT, {
        productId,
        quantity,
        type,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Stock adjusted for ${product.name}`,
        previousQty: currentQty,
        adjustmentQty: quantity,
        newQty: newQty,
        adjustmentId: result.movement.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Stock adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
