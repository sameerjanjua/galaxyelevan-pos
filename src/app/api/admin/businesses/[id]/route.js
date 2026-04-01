import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    await requireSuperAdmin();

    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        locations: true,
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            products: true,
            sales: true,
            customers: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Get revenue data
    const salesData = await prisma.sale.aggregate({
      where: { tenantId: id },
      _sum: { total: true },
    });

    return NextResponse.json({
      ...tenant,
      stats: {
        totalRevenue: salesData._sum.total || 0,
        productCount: tenant._count.products,
        salesCount: tenant._count.sales,
        customerCount: tenant._count.customers,
      },
    });
  } catch (error) {
    console.error("Get business detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business details" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const { name, industry, isSuspended } = await request.json();

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(industry !== undefined && { industry }),
        ...(isSuspended !== undefined && { isSuspended }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Business updated successfully",
      business: tenant,
    });
  } catch (error) {
    console.error("Update business error:", error);
    return NextResponse.json(
      { error: "Failed to update business" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireSuperAdmin();

    const { id } = await params;

    // Don't actually delete, just suspend
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isSuspended: true },
    });

    return NextResponse.json({
      success: true,
      message: "Business suspended successfully",
      business: tenant,
    });
  } catch (error) {
    console.error("Suspend business error:", error);
    return NextResponse.json(
      { error: "Failed to suspend business" },
      { status: 500 }
    );
  }
}
