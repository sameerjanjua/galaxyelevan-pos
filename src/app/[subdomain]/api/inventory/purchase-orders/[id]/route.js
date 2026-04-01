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

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, barcode: true } },
          },
        },
        user: { select: { fullName: true, email: true } },
        tenant: { select: { id: true } },
      },
    });

    if (!po || po.tenant.id !== user.tenantId) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, purchaseOrder: po },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get PO error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
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

    // Verify PO belongs to tenant and is in DRAFT status
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { tenantId: true, status: true },
    });

    if (!po || po.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (po.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft POs can be edited" },
        { status: 400 }
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        expectedDate: body.expectedDate
          ? new Date(body.expectedDate)
          : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Purchase order updated",
        purchaseOrder: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update PO error:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
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

    // Verify PO belongs to tenant
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { tenantId: true, status: true, poNumber: true },
    });

    if (!po || po.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (po.status !== "DRAFT" && po.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only draft and confirmed POs can be cancelled" },
        { status: 400 }
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json(
      {
        success: true,
        message: `PO ${po.poNumber} cancelled`,
        purchaseOrder: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cancel PO error:", error);
    return NextResponse.json(
      { error: "Failed to cancel purchase order" },
      { status: 500 }
    );
  }
}
