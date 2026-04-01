import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import crypto from "node:crypto";

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
        .pbkdf2Sync(password, salt, 310000, 32, "sha256")
        .toString("hex");
    return `${salt}:${hash}`;
}

function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function GET(request) {
    try {
        await requireSuperAdmin();

        // Fetch all tenants with statistics
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                industry: true,
                isSuspended: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        users: true,
                        products: true,
                        sales: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Calculate revenue for each tenant
        const tenantsWithStats = await Promise.all(
            tenants.map(async (tenant) => {
                const salesData = await prisma.sale.aggregate({
                    where: { tenantId: tenant.id },
                    _sum: { total: true, subtotal: true },
                });

                const monthlyRevenue = await prisma.sale.aggregate({
                    where: {
                        tenantId: tenant.id,
                        createdAt: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                        },
                    },
                    _sum: { total: true },
                });

                return {
                    ...tenant,
                    stats: {
                        totalRevenue: salesData._sum.total || 0,
                        monthlyRevenue: monthlyRevenue._sum.total || 0,
                        userCount: tenant._count.users,
                        productCount: tenant._count.products,
                        salesCount: tenant._count.sales,
                    },
                };
            })
        );

        return NextResponse.json(tenantsWithStats);
    } catch (error) {
        console.error("Get businesses error:", error);
        return NextResponse.json(
            { error: "Failed to fetch businesses" },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const superAdmin = await requireSuperAdmin();

        const { name, slug, industry, ownerEmail, ownerName, ownerPassword } =
            await request.json();

        if (!name || !ownerEmail || !ownerName || !ownerPassword) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if slug is unique and not reserved
        const finalSlug = slug || generateSlug(name);
        
        const RESERVED_SLUGS = ["admin", "api", "app", "www", "static", "assets"];
        if (RESERVED_SLUGS.includes(finalSlug)) {
            return NextResponse.json(
                { error: `The name '${finalSlug}' is reserved and cannot be used as a business slug.` },
                { status: 400 }
            );
        }

        const existingTenant = await prisma.tenant.findUnique({
            where: { slug: finalSlug },
        });

        if (existingTenant) {
            return NextResponse.json(
                { error: "Business with this slug already exists" },
                { status: 400 }
            );
        }

        // Check if owner email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: ownerEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
        }

        // Create tenant, owner user, and default location in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create tenant
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    slug: finalSlug,
                    industry,
                    createdByAdminId: superAdmin.id,
                },
            });

            // Create default location
            const location = await tx.location.create({
                data: {
                    name: `${name} - Main Location`,
                    tenantId: tenant.id,
                    timezone: "UTC",
                },
            });

            // Create owner user
            const passwordHash = hashPassword(ownerPassword);
            const user = await tx.user.create({
                data: {
                    email: ownerEmail,
                    fullName: ownerName,
                    passwordHash,
                    role: "OWNER",
                    tenantId: tenant.id,
                    locationId: location.id,
                    isActive: true,
                },
            });

            return { tenant, location, user };
        });

        return NextResponse.json(
            {
                success: true,
                message: "Business created successfully",
                business: {
                    id: result.tenant.id,
                    name: result.tenant.name,
                    slug: result.tenant.slug,
                    industry: result.tenant.industry,
                    owner: {
                        email: result.user.email,
                        name: result.user.fullName,
                    },
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create business error:", error);
        return NextResponse.json(
            { error: "Failed to create business" },
            { status: 500 }
        );
    }
}
