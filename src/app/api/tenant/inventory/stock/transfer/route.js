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

    // Require OWNER or MANAGER role for stock transfers
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const body = await req.json();

    const { productId, fromLocationId, toLocationId, quantity, notes } = body;

    // Validate input
    if (
      !productId ||
      !fromLocationId ||
      !toLocationId ||
      !quantity ||
      quantity <= 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Source and destination locations must be different" },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to tenant
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

    // Verify locations exist and belong to tenant
    const [fromLocation, toLocation] = await Promise.all([
      prisma.location.findUnique({
        where: { id: fromLocationId },
        select: { id: true, name: true, tenantId: true },
      }),
      prisma.location.findUnique({
        where: { id: toLocationId },
        select: { id: true, name: true, tenantId: true },
      }),
    ]);

    if (!fromLocation || fromLocation.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Source location not found" },
        { status: 404 }
      );
    }

    if (!toLocation || toLocation.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Destination location not found" },
        { status: 404 }
      );
    }

    // Role-based location restriction for transfers
    if (user.role === ROLES.MANAGER) {
      if (user.locationId !== fromLocationId) {
        return NextResponse.json(
          { error: "Access denied: managers can only transfer stock FROM their own location" },
          { status: 403 }
        );
      }
    }

    // Get source stock
    const fromStock = await prisma.stock.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId: fromLocationId,
        },
      },
    });

    const fromQty = fromStock?.quantity ?? 0;

    // Validate sufficient stock at source
    if (fromQty < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient stock at source location. Available: ${fromQty}, Requested: ${quantity}`,
          availableQty: fromQty,
          requestedQty: quantity,
        },
        { status: 400 }
      );
    }

    // Perform transfer within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create TRANSFER_OUT movement
      const outMovement = await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          productId,
          locationId: fromLocationId,
          type: "TRANSFER_OUT",
          quantity: -quantity,
          reference: null,
          notes,
          batchNumber: null,
          createdBy: user.id,
        },
      });

      // Create TRANSFER_IN movement
      const inMovement = await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          productId,
          locationId: toLocationId,
          type: "TRANSFER_IN",
          quantity,
          reference: null,
          notes,
          batchNumber: null,
          createdBy: user.id,
        },
      });

      // Update source stock
      const updatedFromStock = await tx.stock.update({
        where: { id: fromStock.id },
        data: { quantity: fromQty - quantity },
      });

      // Update or create destination stock
      const toStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId,
            locationId: toLocationId,
          },
        },
      });

      let updatedToStock;
      if (toStock) {
        updatedToStock = await tx.stock.update({
          where: { id: toStock.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        updatedToStock = await tx.stock.create({
          data: {
            productId,
            locationId: toLocationId,
            quantity,
            minQuantity: 0,
          },
        });
      }

      return {
        outMovement,
        inMovement,
        fromStock: updatedFromStock,
        toStock: updatedToStock,
      };
    });

    // Emit Socket.io events for real-time updates
    const io = getSocketIoInstance();
    if (io) {
      // Alert for source location if stock drops below threshold
      const fromThreshold = result.fromStock.minQuantity > 0 ? result.fromStock.minQuantity : (product.lowStockAlert || 0);
      const fromNewQty = result.fromStock.quantity;

      if (product.trackStock && fromThreshold > 0 && fromNewQty <= fromThreshold) {
        emitToInventory(io, user.tenantId, SOCKET_EVENTS.LOW_STOCK_ALERT, {
          productId,
          productName: product.name,
          currentQty: fromNewQty,
          threshold: fromThreshold,
          locationId: fromLocationId,
        });
      }

      // POS updates for both locations
      emitToPos(io, fromLocationId, SOCKET_EVENTS.PRODUCT_STOCK_CHANGED, {
        productId,
        quantity: -quantity,
      });

      emitToPos(io, toLocationId, SOCKET_EVENTS.PRODUCT_STOCK_CHANGED, {
        productId,
        quantity,
      });

      emitToInventory(io, user.tenantId, SOCKET_EVENTS.STOCK_UPDATED, {
        productId,
        productName: product.name,
        quantity: -quantity,
        locationId: fromLocationId,
        type: "TRANSFER_OUT",
      });

      emitToInventory(io, user.tenantId, SOCKET_EVENTS.STOCK_UPDATED, {
        productId,
        productName: product.name,
        quantity,
        locationId: toLocationId,
        type: "TRANSFER_IN",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Transferred ${quantity} units of ${product.name} from ${fromLocation.name} to ${toLocation.name}`,
        transfer: {
          product: product.name,
          fromLocation: fromLocation.name,
          toLocation: toLocation.name,
          quantity,
          fromStockBefore: fromQty,
          fromStockAfter: fromQty - quantity,
          transferId: result.outMovement.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Stock transfer error:", error);
    return NextResponse.json(
      { error: "Failed to transfer stock" },
      { status: 500 }
    );
  }
}
