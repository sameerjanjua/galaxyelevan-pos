import { requireUser, getLocationFilter, hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const user = await requireUser();

  const locationFilter = getLocationFilter(user);

  const [recentSales, topProducts, location] = await Promise.all([
    prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...locationFilter,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: {
        sale: {
          tenantId: user.tenantId,
          ...locationFilter,
        },
      },
      orderBy: {
        _sum: { quantity: "desc" },
      },
      take: 5,
    }),
    locationFilter.locationId
      ? prisma.location.findUnique({
          where: { id: locationFilter.locationId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const productIds = topProducts.map((p) => p.productId);
  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
      : [];

  const dailyMap = new Map();

  for (const sale of recentSales) {
    const d = new Date(sale.createdAt);
    const key = d.toISOString().slice(0, 10);
    const existing =
      dailyMap.get(key) ?? { date: key, total: 0, count: 0 };
    existing.total += Number(sale.total);
    existing.count += 1;
    dailyMap.set(key, existing);
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Reports</h1>
            <p className="text-xs text-slate-400">
              Simple revenue and top product insights {location?.name ? `for ${location.name}` : "across all locations"}.
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Daily revenue (last {daily.length} days)
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Sales
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-300">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {daily.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No sales yet. Once you start using the POS you&apos;ll
                        see daily totals here.
                      </td>
                    </tr>
                  ) : (
                    daily.map((d) => (
                      <tr key={d.date}>
                        <td className="px-3 py-2 text-slate-100">{d.date}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {d.count}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-100">
                          ${d.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Top products by quantity
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Product
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-300">
                      Qty sold
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No product sales yet.
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p) => {
                      const product = products.find(
                        (pr) => pr.id === p.productId,
                      );
                      return (
                        <tr key={p.productId}>
                          <td className="px-3 py-2 text-slate-100">
                            {product?.name ?? p.productId}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-100">
                            {p._sum.quantity ?? 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

