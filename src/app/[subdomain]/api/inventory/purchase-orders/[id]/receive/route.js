import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function POST(req, { params }) {
  try {
    const user = await requireUser();

    // Require OWNER or MANAGER role for receiving POs
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = params;
    const body = await req.json();

    const { items, locationId, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    // Get PO details
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        tenant: { select: { id: true } },
      },
    });

    if (!po || po.tenant.id !== user.tenantId) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (po.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only confirmed POs can be received" },
        { status: 400 }
      );
    }

    // Verify location exists
    let location;
    if (locationId) {
      location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true, name: true, tenantId: true },
      });

      if (!location || location.tenantId !== user.tenantId) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }
    } else {
      // Use first location if not specified
      location = await prisma.location.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true, tenantId: true },
      });

      if (!location) {
        return NextResponse.json(
          { error: "No location configured for tenant" },
          { status: 400 }
        );
      }
    }

    // Process receipt within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update PO and items
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedDate: new Date(),
        },
      });

      // Process each received item
      for (const item of items) {
        const poItem = po.items.find((pi) => pi.productId === item.productId);

        if (!poItem) {
          throw new Error(`Product ${item.productId} not in PO items`);
        }

        const receivedQty = Number(item.receivedQty || 0);

        if (receivedQty > 0) {
          // Create StockMovement for PURCHASE
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              locationId: location.id,
              type: "PURCHASE",
              quantity: receivedQty,
              reference: po.poNumber,
              notes,
              batchNumber: item.batchNumber || null,
              createdBy: user.id,
            },
          });

          // Update or create Stock record
          const stock = await tx.stock.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: location.id,
              },
            },
          });

          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: { increment: receivedQty } },
            });
          } else {
            await tx.stock.create({
              data: {
                productId: item.productId,
                locationId: location.id,
                quantity: receivedQty,
                minQuantity: 0,
              },
            });
          }
        }

        // Update PurchaseOrderItem with received quantity
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty },
        });
      }

      // Fetch updated details
      const finalPo = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      });

      return finalPo;
    });

    return NextResponse.json(
      {
        success: true,
        message: `PO ${po.poNumber} received and stock updated`,
        purchaseOrder: result,
        location: location.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Receive PO error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to receive purchase order" },
      { status: 500 }
    );
  }
}
