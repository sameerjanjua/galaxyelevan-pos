import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");
    const sku = searchParams.get("sku");

    if (!barcode && !sku) {
      return Response.json(
        { error: "Provide barcode or sku parameter" },
        { status: 400 }
      );
    }

    const where = {
      tenantId: user.tenantId,
      isActive: true,
    };

    if (barcode) {
      where.barcode = barcode;
    } else if (sku) {
      where.sku = sku;
    }

    const product = await prisma.product.findFirst({
      where,
      include: {
        category: true,
        supplier: true,
      },
    });

    if (!product) {
      return Response.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Enrich with stock information
    const stocks = await prisma.stock.findMany({
      where: {
        productId: product.id,
      },
      include: {
        location: true,
      },
    });

    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const isLowStock =
      product.lowStockAlert && totalStock <= product.lowStockAlert;

    return Response.json({
      product: {
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        totalStock,
        isLowStock,
        stockLocations: stocks.map((s) => ({
          locationId: s.locationId,
          location: s.location,
          quantity: s.quantity,
        })),
      },
    });
  } catch (error) {
    console.error("Error looking up product:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
