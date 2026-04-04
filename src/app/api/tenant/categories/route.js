import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "200", 10);

    const categories = await prisma.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      take: limit,
      select: { id: true, name: true, slug: true, parentId: true },
    });

    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await requireUser();
    const { name, parentId } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Generate slug
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!baseSlug) baseSlug = "category"; // fallback
    
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.category.findUnique({
        where: {
          tenantId_slug: { tenantId: user.tenantId, slug },
        },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        parentId: parentId || null,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
