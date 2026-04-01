import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PosClient } from "./PosClient";
import { ROLES, hasRole } from "@/lib/auth";

export default async function PosPage({ searchParams }) {
  const user = await requireUser();

  // Get location from user's assignment or use default location
  let location;
  let allLocations = null;
  const isAdmin = hasRole(user, [ROLES.OWNER]);

  // Check if location is specified in searchParams
  const searchParamsObj = await searchParams;
  const selectedLocationId = searchParamsObj?.location;

  if (isAdmin) {
    // For admins, fetch all locations so they can select one
    allLocations = await prisma.location.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    // Use selected location from searchParams if provided
    if (selectedLocationId) {
      location = await prisma.location.findFirst({
        where: { tenantId: user.tenantId, id: selectedLocationId },
        select: { id: true, name: true },
      });
    }

    // If no valid location, use first location as default
    if (!location) {
      location = allLocations?.[0];
    }
  } else if (user.locationId) {
    // Staff user is assigned to a specific location (ignore searchParams)
    location = await prisma.location.findUnique({
      where: { id: user.locationId },
      select: { id: true, name: true },
    });
  } else {
    // No location assigned to user, get default/first location for tenant
    location = await prisma.location.findFirst({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!location) {
    // No location available, return error page
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Location Configured</h1>
          <p className="text-slate-400 mb-4">
            Please configure a location for your business before using POS.
          </p>
          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const [rawProducts, customers] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      include: {
        stocks: {
          where: { locationId: location.id },
          select: {
            quantity: true,
            locationId: true,
            minQuantity: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  const products = rawProducts.map((p) => ({
    ...p,
    salePrice: Number(p.salePrice),
    costPrice: Number(p.costPrice || 0),
  }));

  return (
    <PosClient
      products={products}
      customers={customers}
      location={location}
      isAdmin={isAdmin}
      allLocations={allLocations}
    />
  );
}

