import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(request) {
    try {
        await requireSuperAdmin();

        // Get all tenants with detailed analytics
        const tenants = await prisma.tenant.findMany({
            select: { id: true, name: true, slug: true },
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const analyticsData = [];

        for (const tenant of tenants) {
            const [sales, users, products, monthlyRevenue] = await Promise.all([
                prisma.sale.aggregate({
                    where: { tenantId: tenant.id },
                    _sum: { total: true, subtotal: true, taxTotal: true },
                    _count: true,
                }),
                prisma.user.count({ where: { tenantId: tenant.id, isActive: true } }),
                prisma.product.count({ where: { tenantId: tenant.id, isActive: true } }),
                prisma.sale.aggregate({
                    where: {
                        tenantId: tenant.id,
                        createdAt: { gte: thirtyDaysAgo },
                    },
                    _sum: { total: true },
                }),
            ]);

            analyticsData.push({
                tenantId: tenant.id,
                tenantName: tenant.name,
                slug: tenant.slug,
                metrics: {
                    totalSales: sales._count,
                    totalRevenue: sales._sum.total || 0,
                    totalSubtotal: sales._sum.subtotal || 0,
                    totalTax: sales._sum.taxTotal || 0,
                    activeUsers: users,
                    activeProducts: products,
                    monthlyRevenue: monthlyRevenue._sum.total || 0,
                    averageOrderValue: sales._count > 0 ? (sales._sum.total || 0) / sales._count : 0,
                },
            });
        }

        return NextResponse.json(analyticsData);
    } catch (error) {
        console.error("Get analytics error:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
