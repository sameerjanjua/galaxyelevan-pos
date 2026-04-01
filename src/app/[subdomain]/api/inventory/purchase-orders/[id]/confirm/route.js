import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function POST(req, { params }) {
  try {
    const user = await requireUser();

    // Require OWNER or MANAGER role for confirming POs
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const { id } = params;

    // Verify PO belongs to tenant and is in DRAFT status
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

    if (po.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft POs can be confirmed" },
        { status: 400 }
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `PO ${po.poNumber} confirmed successfully`,
        purchaseOrder: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Confirm PO error:", error);
    return NextResponse.json(
      { error: "Failed to confirm purchase order" },
      { status: 500 }
    );
  }
}
