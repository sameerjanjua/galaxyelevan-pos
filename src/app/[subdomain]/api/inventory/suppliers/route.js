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

    const isActive = searchParams.get("isActive");
    const city = searchParams.get("city");
    const country = searchParams.get("country");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Build where clause
    const where = { tenantId: user.tenantId };
    if (isActive !== null) where.isActive = isActive === "true";
    if (city) where.city = city;
    if (country) where.country = country;

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          purchaseOrders: { select: { id: true, status: true } },
          products: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    const enriched = suppliers.map((s) => ({
      ...s,
      poCount: s.purchaseOrders.length,
      productCount: s.products.length,
      pendingPoCount: s.purchaseOrders.filter(
        (po) => po.status === "DRAFT" || po.status === "CONFIRMED"
      ).length,
    }));

    return NextResponse.json(
      {
        success: true,
        suppliers: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
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

    const { name, email, phone, address, city, country, supplierCode, terms } =
      body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate supplier code if provided
    if (supplierCode) {
      const existing = await prisma.supplier.findFirst({
        where: {
          tenantId: user.tenantId,
          supplierCode,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Supplier code already exists" },
          { status: 400 }
        );
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        country: country || null,
        supplierCode: supplierCode || null,
        terms: terms || null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Supplier "${name}" created successfully`,
        supplier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
