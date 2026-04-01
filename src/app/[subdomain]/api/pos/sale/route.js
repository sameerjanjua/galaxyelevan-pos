import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ROLES, hasRole } from "@/lib/auth";
import {
  emitToDashboard,
  emitToInventory,
  emitToPos,
  emitToLocation,
  getSocketIoInstance,
} from "@/lib/socket-io.server";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export async function POST(req) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const items = body.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items supplied." },
        { status: 400 },
      );
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        tenantId: user.tenantId,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Products not found for tenant." },
        { status: 400 },
      );
    }

    let subtotal = 0;

    const lineItems = items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product || item.quantity <= 0) return null;
        const price = Number(product.salePrice);
        const lineTotal = price * item.quantity;
        subtotal += lineTotal;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: price,
          lineTotal,
        };
      })
      .filter((v) => v !== null);

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "No valid line items." },
        { status: 400 },
      );
    }

    const discountPercent = Number(body.discountPercent ?? 0);
    const discountTotal =
      !Number.isNaN(discountPercent) && discountPercent > 0
        ? (subtotal * discountPercent) / 100
        : 0;

    const total = subtotal - discountTotal;

    // Get location from request (for admin overrides), user's assignment, or use default location
    let location;
    const requestedLocationId = body.locationId;
    const isAdmin = hasRole(user, [ROLES.OWNER, ROLES.MANAGER]);

    // If admin provided a specific location in request, use it
    if (isAdmin && requestedLocationId) {
      location = await prisma.location.findFirst({
        where: { tenantId: user.tenantId, id: requestedLocationId },
        select: { id: true, name: true },
      });

      if (!location) {
        return NextResponse.json(
          { error: "Requested location not found or not accessible." },
          { status: 400 },
        );
      }
    } else if (user.locationId) {
      // User is assigned to a specific location
      location = await prisma.location.findUnique({
        where: { id: user.locationId },
        select: { id: true, name: true },
      });

      if (!location) {
        return NextResponse.json(
          { error: "User's assigned location not found." },
          { status: 400 },
        );
      }
    } else {
      // No location assigned to user, get default/first location for tenant
      location = await prisma.location.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });

      if (!location) {
        return NextResponse.json(
          { error: "No location configured for tenant." },
          { status: 400 },
        );
      }
    }

    // INVENTORY VALIDATION: Check stock levels before creating sale
    // Get stocks for current location
    const stocksAtLocation = await prisma.stock.findMany({
      where: {
        productId: { in: lineItems.map((item) => item.productId) },
        locationId: location.id,
      },
    });

    // Create missing stock records for tracked products at this location
    const productsNeedingStockRecords = lineItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product.trackStock) return null;

        const hasStockAtLocation = stocksAtLocation.some(
          (s) => s.productId === item.productId
        );
        return hasStockAtLocation ? null : item.productId;
      })
      .filter(Boolean);

    // Create missing stock records in a transaction
    if (productsNeedingStockRecords.length > 0) {
      const createdStocks = await Promise.all(
        productsNeedingStockRecords.map((productId) => {
          const product = products.find((p) => p.id === productId);
          return prisma.stock.create({
            data: {
              productId,
              locationId: location.id,
              quantity: 0,
              minQuantity: product?.lowStockAlert || 0,
            },
          });
        })
      );
      stocksAtLocation.push(...createdStocks);
    }

    // Validate stock availability for tracked products
    for (const lineItem of lineItems) {
      const product = products.find((p) => p.id === lineItem.productId);

      // Skip validation if product doesn't track stock
      if (!product.trackStock) continue;

      const stockAtLocation = stocksAtLocation.find(
        (s) => s.productId === lineItem.productId
      );
      const currentQty = stockAtLocation?.quantity ?? 0;

      // For tracked products, always validate sufficient stock is available
      if (currentQty < lineItem.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product.name}. Available: ${currentQty}, Requested: ${lineItem.quantity}`,
            productId: product.id,
            availableQty: currentQty,
            requestedQty: lineItem.quantity,
          },
          { status: 400 },
        );
      }
    }

    const invoiceNumber = `INV-${Date.now()}`;

    // Create sale with transaction to ensure consistency
    const sale = await prisma.$transaction(async (tx) => {
      // Step 1: Create the sale and sale items
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          status: "COMPLETED",
          subtotal,
          total,
          taxTotal: 0,
          discountTotal,
          tenantId: user.tenantId,
          locationId: location.id,
          userId: user.id,
          customerId:
            body.customerId && body.customerId.length > 0
              ? body.customerId
              : null,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          createdAt: true,
        },
      });

      // Step 2: Create stock movements and update stock quantities
      for (const lineItem of lineItems) {
        const product = products.find((p) => p.id === lineItem.productId);

        // Create StockMovement audit entry
        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: lineItem.productId,
            locationId: location.id,
            type: "SALE",
            quantity: -lineItem.quantity, // Negative because it's a deduction
            reference: invoiceNumber,
            notes: null,
            batchNumber: null,
            createdBy: user.id,
          },
        });

        // Update Stock table
        if (product.trackStock) {
          await tx.stock.update({
            where: {
              productId_locationId: {
                productId: lineItem.productId,
                locationId: location.id,
              },
            },
            data: {
              quantity: {
                decrement: lineItem.quantity,
              },
            },
          });
        }
      }

      return newSale;
    });

    // Emit Socket.io events for real-time updates
    const io = getSocketIoInstance();

    if (io) {
      // Emit sale completed event to dashboard
      emitToDashboard(io, user.tenantId, SOCKET_EVENTS.SALE_COMPLETED, {
        invoiceNumber: sale.invoiceNumber,
        total: sale.total,
        createdAt: sale.createdAt,
        locationId: location.id,
        locationName: location.name,
      });

      // Emit stock updates to inventory and POS
      lineItems.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product && product.trackStock) {
          emitToInventory(io, user.tenantId, SOCKET_EVENTS.STOCK_UPDATED, {
            productId: item.productId,
            productName: product.name,
            quantity: -item.quantity,
            locationId: location.id,
            type: "SALE",
            reference: invoiceNumber,
          });

          emitToPos(io, location.id, SOCKET_EVENTS.PRODUCT_STOCK_CHANGED, {
            productId: item.productId,
            quantity: -item.quantity,
            reference: invoiceNumber,
          });

          emitToLocation(io, location.id, SOCKET_EVENTS.STOCK_MOVEMENT, {
            productId: item.productId,
            quantity: -item.quantity,
            type: "SALE",
          });

          // Check if stock is now low/critical for alerts
          const currentStock = stocksAtLocation.find((s) => s.productId === item.productId);
          const newQty = (currentStock?.quantity ?? 0) - item.quantity;
          const threshold = currentStock?.minQuantity > 0 ? currentStock.minQuantity : (product.lowStockAlert || 0);

          if (threshold > 0 && newQty <= threshold) {
            emitToInventory(io, user.tenantId, SOCKET_EVENTS.LOW_STOCK_ALERT, {
              productId: item.productId,
              productName: product.name,
              currentQty: newQty,
              threshold: threshold,
              locationId: location.id,
            });
          }
        }
      });

      // Emit revenue update to dashboard
      emitToDashboard(io, user.tenantId, SOCKET_EVENTS.REVENUE_UPDATED, {
        total: sale.total,
        invoiceNumber: sale.invoiceNumber,
        locationId: location.id,
        locationName: location.name,
      });
    }

    return NextResponse.json({ success: true, sale }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create sale." },
      { status: 500 },
    );
  }
}

