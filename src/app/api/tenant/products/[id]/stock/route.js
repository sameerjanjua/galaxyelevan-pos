import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function POST(req, { params }) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = params;
    const body = await req.json();

    const { locationId, quantity, minQuantity, notes } = body;

    if (!locationId || quantity === undefined) {
      return NextResponse.json(
        { error: "locationId and quantity are required" },
        { status: 400 }
      );
    }

    // Verify product belongs to tenant
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, tenantId: true, name: true, trackStock: true },
    });

    if (!product || product.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, tenantId: true, name: true },
    });

    if (!location || location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Initialize stock within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if stock already exists
      const existingStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: id,
            locationId,
          },
        },
      });

      let stock;
      if (existingStock) {
        // Update existing
        const oldQty = existingStock.quantity;
        const diff = Number(quantity) - oldQty;

        stock = await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: Number(quantity),
            minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
          },
        });

        // Create movement if quantity changed
        if (diff !== 0) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: id,
              locationId,
              type: "ADJUSTMENT",
              quantity: diff,
              reference: `STOCK_INIT_UPDATE`,
              notes: notes || "Stock level adjustment during initialization",
              createdBy: user.id,
            },
          });
        }
      } else {
        // Create new stock record
        stock = await tx.stock.create({
          data: {
            productId: id,
            locationId,
            quantity: Number(quantity),
            minQuantity: minQuantity !== undefined ? Number(minQuantity) : 0,
          },
        });

        // Create movement for initial stock
        if (Number(quantity) > 0) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: id,
              locationId,
              type: "PURCHASE",
              quantity: Number(quantity),
              reference: `STOCK_INIT`,
              notes: notes || "Initial stock assignment",
              createdBy: user.id,
            },
          });
        }
      }

      return stock;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Stock initialized for ${product.name} at ${location.name}`,
        stock: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Initialize stock error:", error);
    return NextResponse.json(
      { error: "Failed to initialize stock" },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const user = await requireUser();
    const { id } = params;

    const stocks = await prisma.stock.findMany({
      where: {
        productId: id,
        location: {
          tenantId: user.tenantId,
        },
      },
      include: {
        location: { select: { id: true, name: true, code: true } },
        product: { select: { name: true, sku: true } },
      },
    });

    const product = await prisma.product.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!product || product.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stocks,
        totalStock: stocks.reduce((sum, s) => sum + s.quantity, 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get product stocks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product stocks" },
      { status: 500 }
    );
  }
}
