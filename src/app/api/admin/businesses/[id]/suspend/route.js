import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    await requireSuperAdmin();

    const { id } = await params;

    // Check if business exists
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { isSuspended: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Check if already suspended
    if (tenant.isSuspended) {
      return NextResponse.json(
        {
          error: "Business is already suspended",
          business: tenant,
        },
        { status: 400 }
      );
    }

    // Suspend the business
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { isSuspended: true },
    });

    return NextResponse.json({
      success: true,
      message: `Business "${tenant.name}" has been suspended successfully`,
      business: updatedTenant,
    });
  } catch (error) {
    console.error("Suspend business error:", error);
    return NextResponse.json(
      { error: "Failed to suspend business" },
      { status: 500 }
    );
  }
}
