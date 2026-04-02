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
