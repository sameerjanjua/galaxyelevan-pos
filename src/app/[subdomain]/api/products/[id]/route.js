import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const locationFilter =
      user.role !== ROLES.OWNER && user.locationId
        ? { locationId: user.locationId }
        : {};

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        stocks: {
          where: locationFilter,
          include: {
            location: { select: { id: true, name: true, code: true } },
          },
        },
        saleItems: {
          where:
            user.role !== ROLES.OWNER && user.locationId
              ? { sale: { locationId: user.locationId } }
              : {},
          select: { quantity: true },
          take: 10,
        },
        tenant: { select: { id: true } },
      },
    });

    if (!product || product.tenant.id !== user.tenantId) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get recent movements
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: id,
        tenantId: user.tenantId,
        ...locationFilter,
      },
      include: {
        location: { select: { name: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Calculate statistics
    const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalSales = product.saleItems.reduce((sum, s) => sum + s.quantity, 0);
    const historicalSalesValue = product.saleItems.length;

    return NextResponse.json(
      {
        success: true,
        product: {
          ...product,
          totalStock,
          totalSales,
          salesCount: historicalSalesValue,
          isLowStock: product.stocks.some((s) => {
            const threshold = s.minQuantity > 0 ? s.minQuantity : (product.lowStockAlert || 0);
            return s.quantity <= threshold;
          }),
        },
        movements,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await requireUser();
    
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = await params;
    const body = await req.json();

    const locationFilter =
      user.role !== ROLES.OWNER && user.locationId
        ? { locationId: user.locationId }
        : {};

    // Verify product belongs to tenant
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

    // Check SKU uniqueness if changing
    if (body.sku) {
      const existing = await prisma.product.findFirst({
        where: {
          tenantId: user.tenantId,
          sku: body.sku,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Check barcode uniqueness if changing
    if (body.barcode) {
      const existing = await prisma.product.findUnique({
        where: { barcode: body.barcode },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "Barcode already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name || undefined,
        sku: body.sku !== undefined ? body.sku : undefined,
        barcode: body.barcode !== undefined ? body.barcode : undefined,
        description: body.description !== undefined ? body.description : undefined,
        type: body.type !== undefined ? body.type : undefined,
        unit: body.unit !== undefined ? body.unit : undefined,
        categoryId: body.categoryId !== undefined ? (body.categoryId || null) : undefined,
        supplierId: body.supplierId !== undefined ? (body.supplierId || null) : undefined,
        costPrice:
          body.costPrice !== undefined ? Number(body.costPrice) : undefined,
        salePrice:
          body.salePrice !== undefined ? Number(body.salePrice) : undefined,
        lowStockAlert:
          body.lowStockAlert !== undefined
            ? (body.lowStockAlert === "" || body.lowStockAlert === null ? null : Number(body.lowStockAlert))
            : undefined,
        trackStock: body.trackStock !== undefined ? body.trackStock : undefined,
        batchTracking: body.batchTracking !== undefined ? body.batchTracking : undefined,
        expiryTracking: body.expiryTracking !== undefined ? body.expiryTracking : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        metadata: body.metadata !== undefined ? body.metadata : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        stocks: {
          where: locationFilter,
          include: {
            location: { select: { id: true, name: true, code: true } },
          },
        },
        saleItems: {
          where:
            user.role !== ROLES.OWNER && user.locationId
              ? { sale: { locationId: user.locationId } }
              : {},
          select: { quantity: true },
          take: 10,
        },
        tenant: { select: { id: true } },
      },
    });

    // Get recent movements
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: id,
        tenantId: user.tenantId,
        ...locationFilter,
      },
      include: {
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Calculate statistics
    const totalStock = updated.stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalSales = updated.saleItems.reduce((sum, s) => sum + s.quantity, 0);
    const historicalSalesValue = updated.saleItems.length;

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        product: {
          ...updated,
          totalStock,
          totalSales,
          salesCount: historicalSalesValue,
        },
        movements,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await requireUser();
    
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = await params;

    const locationFilter =
      user.role !== ROLES.OWNER && user.locationId
        ? { locationId: user.locationId }
        : {};

    // Verify product belongs to tenant
    const product = await prisma.product.findUnique({
      where: { id },
      select: { tenantId: true, name: true },
    });

    if (!product || product.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Deactivate instead of delete
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        stocks: {
          where: locationFilter,
          include: {
            location: { select: { id: true, name: true, code: true } },
          },
        },
        saleItems: {
          where:
            user.role !== ROLES.OWNER && user.locationId
              ? { sale: { locationId: user.locationId } }
              : {},
          select: { quantity: true },
          take: 10,
        },
        tenant: { select: { id: true } },
      },
    });

    // Get recent movements
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: id,
        tenantId: user.tenantId,
        ...locationFilter,
      },
      include: {
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Calculate statistics
    const totalStock = updated.stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalSales = updated.saleItems.reduce((sum, s) => sum + s.quantity, 0);
    const historicalSalesValue = updated.saleItems.length;

    return NextResponse.json(
      {
        success: true,
        message: `Product "${product.name}" deactivated`,
        product: {
          ...updated,
          totalStock,
          totalSales,
          salesCount: historicalSalesValue,
        },
        movements,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate product" },
      { status: 500 }
    );
  }
}
