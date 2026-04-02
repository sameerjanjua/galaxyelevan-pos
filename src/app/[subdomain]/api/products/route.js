import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";
import { resolveLocationFilter } from "@/lib/resolveLocationFilter";
import {
  emitToProducts,
  emitToInventory,
  getSocketIoInstance,
} from "@/lib/socket-io.server";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category");
    const supplier = searchParams.get("supplier");
    const requestedLocationId = searchParams.get("locationId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Use centralized location filter based on role + sidebar selection
    const locationFilter = resolveLocationFilter(user, requestedLocationId);

    // Build where clause
    const where = { tenantId: user.tenantId };
    if (category) where.categoryId = category;
    if (supplier) where.supplierId = supplier;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, supplierCode: true } },
          stocks: {
            where: locationFilter, // Filter stocks by location if restricted
            include: {
              location: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Enrich with inventory summary
    const enriched = products.map((p) => {
      const totalStock = p.stocks.reduce((sum, s) => sum + s.quantity, 0);
      const isLowStock = p.stocks.some((s) => {
        const threshold = s.minQuantity > 0 ? s.minQuantity : (p.lowStockAlert || 0);
        return s.quantity <= threshold;
      });

      return {
        ...p,
        totalStock,
        stockLocations: p.stocks.map((s) => ({
          locationId: s.location.id,
          locationName: s.location.name,
          quantity: s.quantity,
          minQuantity: s.minQuantity,
        })),
        isLowStock,
        supplierName: p.supplier?.name || "—",
      };
    });

    return NextResponse.json(
      {
        success: true,
        products: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await requireUser();

    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const body = await req.json();

    const {
      name,
      sku,
      barcode,
      description,
      categoryId,
      supplierId,
      costPrice,
      salePrice,
      trackStock,
      lowStockAlert,
      unit,
      metadata,
      initialStock,
      locationId,
    } = body;

    // Validate required fields
    if (!name || !salePrice) {
      return NextResponse.json(
        { error: "Name and sale price are required" },
        { status: 400 }
      );
    }

    // Check SKU uniqueness if provided
    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { tenantId: user.tenantId, sku },
      });
      if (existing) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Check barcode uniqueness if provided
    if (barcode) {
      const existing = await prisma.product.findUnique({
        where: { barcode },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Barcode already exists" },
          { status: 400 }
        );
      }
    }

    // Get default location if not provided
    let stockLocation = locationId;
    if (!stockLocation && trackStock) {
      const location = await prisma.location.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json(
          { error: "No location configured for tenant" },
          { status: 400 }
        );
      }
      stockLocation = location.id;
    }

    // Create product with stock within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create product
      const product = await tx.product.create({
        data: {
          tenantId: user.tenantId,
          name,
          sku: sku || null,
          barcode: barcode || null,
          description: description || null,
          categoryId: categoryId || null,
          supplierId: supplierId || null,
          costPrice: Number(costPrice || 0),
          salePrice: Number(salePrice),
          trackStock: trackStock !== false,
          lowStockAlert: lowStockAlert ? Number(lowStockAlert) : null,
          unit: unit || "unit",
          metadata: metadata || {},
        },
      });

      // Create initial stock if tracking and initial stock provided
      if (trackStock && stockLocation) {
        const stockQty = Number(initialStock || 0);

        if (stockQty > 0) {
          // Create stock record
          await tx.stock.create({
            data: {
              productId: product.id,
              locationId: stockLocation,
              quantity: stockQty,
              minQuantity: lowStockAlert ? Number(lowStockAlert) : 0,
            },
          });

          // Create stock movement audit entry
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: product.id,
              locationId: stockLocation,
              type: "PURCHASE",
              quantity: stockQty,
              reference: `PRODUCT_CREATION_${product.id}`,
              notes: "Initial stock from product creation",
              createdBy: user.id,
            },
          });
        } else {
          // Create stock record even if zero
          await tx.stock.create({
            data: {
              productId: product.id,
              locationId: stockLocation,
              quantity: 0,
              minQuantity: lowStockAlert ? Number(lowStockAlert) : 0,
            },
          });
        }
      }

      return product;
    });

    // Emit Socket.io events for real-time updates
    const io = getSocketIoInstance();

    if (io) {
      emitToProducts(io, user.tenantId, SOCKET_EVENTS.PRODUCT_CREATED, {
        id: result.id,
        name: result.name,
        sku: result.sku,
        barcode: result.barcode,
        salePrice: result.salePrice,
        costPrice: result.costPrice,
        trackStock: result.trackStock,
      });

      emitToInventory(io, user.tenantId, SOCKET_EVENTS.STOCK_UPDATED, {
        productId: result.id,
        productName: result.name,
        type: "PRODUCT_CREATED",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Product "${name}" created successfully`,
        product: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
