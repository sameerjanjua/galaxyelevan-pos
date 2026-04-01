import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where = { tenantId: user.tenantId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [pos, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        purchaseOrders: pos,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get POs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
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

    const { supplierId, items, expectedDate, notes } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: supplierId, items" },
        { status: 400 }
      );
    }

    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, tenantId: true },
    });

    if (!supplier || supplier.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Verify all products exist and belong to tenant
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId: user.tenantId,
      },
      select: { id: true, name: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    let totalAmount = 0;
    const poItems = items.map((item) => {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice);
      totalAmount += lineTotal;
      return {
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal,
        receivedQty: 0,
      };
    });

    // Generate PO number
    const poNumber = `PO-${Date.now()}`;

    // Create PO with items
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        poNumber,
        status: "DRAFT",
        totalAmount,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        createdBy: user.id,
        items: {
          create: poItems,
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Purchase order ${poNumber} created`,
        purchaseOrder: po,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create PO error:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
