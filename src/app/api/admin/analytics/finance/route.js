import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(request) {
    try {
        await requireSuperAdmin();

        // Get all sales data across all tenants
        const totalSalesData = await prisma.sale.aggregate({
            _sum: { total: true, subtotal: true, taxTotal: true, discountTotal: true },
            _count: true,
        });

        // Revenue by business
        const salesByBusiness = await prisma.sale.groupBy({
            by: ["tenantId"],
            _sum: { total: true },
            _count: true,
        });

        const businessesRevenue = await Promise.all(
            salesByBusiness.map(async (sale) => {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: sale.tenantId },
                    select: { name: true },
                });
                return {
                    tenantId: sale.tenantId,
                    tenantName: tenant?.name || "Unknown",
                    revenue: sale._sum.total || 0,
                    salesCount: sale._count,
                };
            })
        );

        // Payment methods breakdown
        const paymentBreakdown = await prisma.payment.groupBy({
            by: ["paymentTypeId"],
            _sum: { amount: true },
            _count: true,
        });

        const paymentMethods = await Promise.all(
            paymentBreakdown.map(async (payment) => {
                const paymentType = await prisma.paymentType.findUnique({
                    where: { id: payment.paymentTypeId },
                    select: { name: true },
                });
                return {
                    paymentTypeId: payment.paymentTypeId,
                    name: paymentType?.name || "Unknown",
                    amount: payment._sum.amount || 0,
                    count: payment._count,
                };
            })
        );

        // Monthly revenue trend
        const now = new Date();
        const monthlyTrend = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthRevenue = await prisma.sale.aggregate({
                where: {
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
                _sum: { total: true },
            });

            monthlyTrend.push({
                month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                revenue: monthRevenue._sum.total || 0,
            });
        }

        return NextResponse.json({
            overall: {
                totalRevenue: totalSalesData._sum.total || 0,
                totalSubtotal: totalSalesData._sum.subtotal || 0,
                totalTax: totalSalesData._sum.taxTotal || 0,
                totalDiscount: totalSalesData._sum.discountTotal || 0,
                totalSalesCount: totalSalesData._count,
            },
            byBusiness: businessesRevenue.sort((a, b) => b.revenue - a.revenue),
            byPaymentMethod: paymentMethods,
            monthlyTrend,
        });
    } catch (error) {
        console.error("Get finance analytics error:", error);
        return NextResponse.json(
            { error: "Failed to fetch finance analytics" },
            { status: 500 }
        );
    }
}
