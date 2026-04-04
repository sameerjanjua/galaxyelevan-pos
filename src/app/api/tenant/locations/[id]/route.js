import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const user = await requireUser();
    const { id } = params;

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stocks: true,
            sales: true,
            stockMovements: true,
          },
        },
      },
    });

    if (!location || location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        location,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get location error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await requireUser();

    // Require OWNER role for updating locations
    const roleError = requireRole(user, [ROLES.OWNER]);
    if (roleError) return roleError;

    const { id } = await params;
    const body = await req.json();

    const { name, code, address, city, country, phone, timezone } = body;

    if (!name || !code || !address || !city || !country || !phone || !timezone) {
      return NextResponse.json(
        { error: "All location fields are required" },
        { status: 400 }
      );
    }

    // Verify location belongs to user's tenant
    const location = await prisma.location.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!location || location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // If code is being changed, verify new code is unique
    if (body.code) {
      const existing = await prisma.location.findFirst({
        where: {
          tenantId: user.tenantId,
          code: body.code,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Location code already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        address: body.address,
        city: body.city,
        country: body.country,
        phone: body.phone,
        timezone: body.timezone,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        country: true,
        phone: true,
        timezone: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Location updated successfully",
        location: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await requireUser();

    // Require OWNER role for deleting locations
    const roleError = requireRole(user, [ROLES.OWNER]);
    if (roleError) return roleError;

    const { id } = await params;

    // Verify location belongs to tenant and has no active usage
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stocks: true,
            sales: true,
          },
        },
      },
    });

    if (!location || location.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Check if it's the first ever location created for this tenant
    const firstLocation = await prisma.location.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (firstLocation?.id === id) {
      return NextResponse.json(
        { error: "The primary business location cannot be deleted" },
        { status: 400 }
      );
    }


    if (location._count.stocks > 0 || location._count.sales > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete location with existing stocks or sales records",
        },
        { status: 400 }
      );
    }

    await prisma.location.delete({ where: { id } });

    return NextResponse.json(
      {
        success: true,
        message: "Location deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete location error:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
