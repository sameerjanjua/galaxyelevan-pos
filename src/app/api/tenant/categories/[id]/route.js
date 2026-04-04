import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { name, parentId } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory || existingCategory.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Generate slug
    let slug = existingCategory.slug;
    if (existingCategory.name !== name.trim()) {
      let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!baseSlug) baseSlug = "category";
      
      slug = baseSlug;
      let counter = 1;
      while (true) {
        const conflict = await prisma.category.findFirst({
          where: {
            tenantId: user.tenantId,
            slug,
            id: { not: id },
          },
        });
        if (!conflict) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Check for circular dependency if parentId is provided
    if (parentId && parentId === id) {
      return NextResponse.json(
        { error: "A category cannot be its own parent" },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug,
        parentId: parentId || null,
      },
    });

    return NextResponse.json({ success: true, category: updatedCategory }, { status: 200 });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!existingCategory || existingCategory.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (existingCategory._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It is associated with ${existingCategory._count.products} product(s).` },
        { status: 400 }
      );
    }

    if (existingCategory._count.children > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It has ${existingCategory._count.children} subcategories.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
