import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where: { tenantId: user.tenantId },
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.location.count({ where: { tenantId: user.tenantId } }),
    ]);

    return NextResponse.json(
      {
        success: true,
        locations,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await requireUser();

    // Require OWNER role for creating locations
    const roleError = requireRole(user, [ROLES.OWNER]);
    if (roleError) return roleError;

    const body = await req.json();

    const { name, code, address, city, country, phone, timezone } = body;

    if (!name || !code || !address || !city || !country || !phone || !timezone) {
      return NextResponse.json(
        { error: "All location fields are required" },
        { status: 400 }
      );
    }

    // Check code uniqueness per tenant
    const existing = await prisma.location.findFirst({
      where: { tenantId: user.tenantId, code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Location code already exists" },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        tenantId: user.tenantId,
        name,
        code,
        address,
        city,
        country,
        phone,
        timezone,
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
        message: `Location "${name}" created successfully`,
        location,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create location error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
