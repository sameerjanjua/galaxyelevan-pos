import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          include: {
            items: { include: { product: { select: { name: true, sku: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        products: { select: { id: true, name: true, sku: true } },
        tenant: { select: { id: true } },
      },
    });

    if (!supplier || supplier.tenant.id !== user.tenantId) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, supplier },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get supplier error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = params;
    const body = await req.json();

    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!supplier || supplier.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Check for duplicate supplier code if provided
    if (body.supplierCode) {
      const existing = await prisma.supplier.findFirst({
        where: {
          tenantId: user.tenantId,
          supplierCode: body.supplierCode,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Supplier code already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name || undefined,
        email: body.email !== undefined ? body.email : undefined,
        phone: body.phone !== undefined ? body.phone : undefined,
        address: body.address !== undefined ? body.address : undefined,
        city: body.city !== undefined ? body.city : undefined,
        country: body.country !== undefined ? body.country : undefined,
        supplierCode: body.supplierCode !== undefined ? body.supplierCode : undefined,
        terms: body.terms !== undefined ? body.terms : undefined,
        isActive:
          body.isActive !== undefined ? body.isActive : undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Supplier updated successfully",
        supplier: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update supplier error:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = params;

    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { tenantId: true, name: true },
    });

    if (!supplier || supplier.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Deactivate instead of delete
    const updated = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Supplier "${supplier.name}" deactivated`,
        supplier: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete supplier error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate supplier" },
      { status: 500 }
    );
  }
}
