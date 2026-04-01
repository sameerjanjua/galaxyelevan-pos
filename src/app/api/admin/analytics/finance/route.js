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

        const tenantIds = salesByBusiness.map((sale) => sale.tenantId);
        const tenants = tenantIds.length > 0
            ? await prisma.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { id: true, name: true },
            })
            : [];
        const tenantNameById = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

        const businessesRevenue = salesByBusiness.map((sale) => ({
            tenantId: sale.tenantId,
            tenantName: tenantNameById.get(sale.tenantId) || "Unknown",
            revenue: sale._sum.total || 0,
            salesCount: sale._count,
        }));

        // Payment methods breakdown
        const paymentBreakdown = await prisma.payment.groupBy({
            by: ["paymentTypeId"],
            _sum: { amount: true },
            _count: true,
        });

        const paymentTypeIds = paymentBreakdown.map((payment) => payment.paymentTypeId);
        const paymentTypes = paymentTypeIds.length > 0
            ? await prisma.paymentType.findMany({
                where: { id: { in: paymentTypeIds } },
                select: { id: true, name: true },
            })
            : [];
        const paymentTypeNameById = new Map(paymentTypes.map((paymentType) => [paymentType.id, paymentType.name]));

        const paymentMethods = paymentBreakdown.map((payment) => ({
            paymentTypeId: payment.paymentTypeId,
            name: paymentTypeNameById.get(payment.paymentTypeId) || "Unknown",
            amount: payment._sum.amount || 0,
            count: payment._count,
        }));

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
