import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PosClient } from "@/components/tenant/pos/PosClient";
import { ROLES, hasRole } from "@/lib/auth";

export default async function PosPage() {
  const user = await requireUser();

  // Fetch all locations for this tenant (needed for owners/global managers)
  const allLocations = await prisma.location.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  // Fetch customers
  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });

  if (allLocations.length === 0) {
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

  return (
    <PosClient
      customers={customers}
      allLocations={allLocations}
      user={user}
    />
  );
}
