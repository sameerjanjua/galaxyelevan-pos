"use client";

import { useEffect, useState } from "react";
import { useActiveLocation } from "@/hooks/useActiveLocation";

export default function ReportsPage() {
  const { activeLocationId, activeLocationName, isAllLocations } = useActiveLocation();
  const [daily, setDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchReports() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeLocationId) params.set("locationId", activeLocationId);

        const res = await fetch(`/api/tenant/reports?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setDaily(data.daily || []);
          setTopProducts(data.topProducts || []);
        }
      } catch (err) {
        console.error("Reports fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => { cancelled = true; };
  }, [activeLocationId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Reports</h1>
            <p className="text-xs text-slate-400">
              Revenue and top product insights{" "}
              {isAllLocations
                ? "across all locations"
                : `for ${activeLocationName}`}.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-sm">Loading report data...</div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">
                Daily revenue (last {daily.length} days)
              </h2>
              <div className="overflow-hidden rounded-lg border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800 text-xs">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-300">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-300">Sales</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-300">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {daily.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No sales yet. Once you start using the POS you&apos;ll see daily totals here.
                        </td>
                      </tr>
                    ) : (
                      daily.map((d) => (
                        <tr key={d.date}>
                          <td className="px-3 py-2 text-slate-100">{d.date}</td>
                          <td className="px-3 py-2 text-slate-300">{d.count}</td>
                          <td className="px-3 py-2 text-right text-slate-100">${d.total.toFixed(2)}</td>
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
                      <th className="px-3 py-2 text-left font-medium text-slate-300">Product</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-300">Qty sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-6 text-center text-slate-500">
                          No product sales yet.
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((p) => (
                        <tr key={p.productId}>
                          <td className="px-3 py-2 text-slate-100">{p.name}</td>
                          <td className="px-3 py-2 text-right text-slate-100">{p.totalSold}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
