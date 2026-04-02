"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";
import { useActiveLocation } from "@/lib/useActiveLocation";

export function DashboardClient({ user }) {
  const { activeLocationId, activeLocationName, isAllLocations } = useActiveLocation();

  const [recentSales, setRecentSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newSaleNotification, setNewSaleNotification] = useState(null);

  const { emit, on, off } = useSocket(`subscribe-dashboard`);

  // Fetch dashboard data whenever activeLocationId changes
  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeLocationId) params.set("locationId", activeLocationId);

        const res = await fetch(`/api/tenant/dashboard?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTotalRevenue(data.totalRevenue);
          setTotalSales(data.totalSales);
          setRecentSales(data.recentSales);
          setTenant(data.tenant);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, [activeLocationId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (emit) {
      emit("subscribe-dashboard", {
        tenantId: user?.tenantId,
        locationId: activeLocationId,
      });
    }
  }, [emit, user?.tenantId, activeLocationId]);

  useEffect(() => {
    const handleSaleCompleted = (data) => {
      if (activeLocationId && data.locationId !== activeLocationId) {
        return;
      }

      if (data) {
        setNewSaleNotification(`Sale ${data.invoiceNumber} completed`);
        setTimeout(() => setNewSaleNotification(null), 5000);

        setRecentSales((prev) => {
          const newSale = {
            id: `temp-${Date.now()}`,
            invoiceNumber: data.invoiceNumber,
            total: data.total,
            createdAt: new Date(data.createdAt),
            customer: null,
            location: { name: data.locationName },
          };
          return [newSale, ...prev.slice(0, 4)];
        });

        setTotalSales((prev) => prev + 1);
      }
    };

    const handleRevenueUpdate = (data) => {
      if (activeLocationId && data.locationId !== activeLocationId) {
        return;
      }

      if (data && data.total) {
        setTotalRevenue((prev) => prev + data.total);
      }
    };

    on(SOCKET_EVENTS.SALE_COMPLETED, handleSaleCompleted);
    on(SOCKET_EVENTS.REVENUE_UPDATED, handleRevenueUpdate);

    return () => {
      off(SOCKET_EVENTS.SALE_COMPLETED);
      off(SOCKET_EVENTS.REVENUE_UPDATED);
    };
  }, [on, off, activeLocationId]);

  return (
    <>
      {/* Real-time notification */}
      {newSaleNotification && (
        <div className="fixed top-4 right-4 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg animation-fadeInOut z-50">
          ✓ {newSaleNotification}
        </div>
      )}

      {/* Suspension Notice */}
      {tenant?.isSuspended && (
        <div className="mb-6 rounded-lg border border-red-700 bg-red-900/20 p-4 text-red-200">
          <div className="flex items-start gap-3">
            <div className="text-xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold"><strong>{tenant.name}</strong> account is suspended</h3>
              <p className="mt-1 text-sm">
                Your business account has been suspended. You cannot perform any transactions. Please contact support to restore access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location context indicator */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
        <span>📍</span>
        <span>{isAllLocations ? "Showing data from all locations" : `Showing data for ${activeLocationName}`}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400 text-sm">Loading dashboard data...</div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-medium text-slate-400">Total revenue</p>
              <p className="mt-2 text-2xl font-semibold">
                ${Number(totalRevenue).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">🔄 Real-time updates enabled</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-medium text-slate-400">Total sales (all time)</p>
              <p className="mt-2 text-2xl font-semibold">{totalSales}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-medium text-slate-400">Quick actions</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link
                  href="/pos"
                  className="rounded-full px-3 py-1.5 font-semibold bg-sky-500 text-white hover:bg-sky-400"
                >
                  New sale
                </Link>
                {user && (user?.role === "OWNER" || user?.role === "MANAGER") && (
                  <Link
                    href="/products/new"
                    className="rounded-full px-3 py-1.5 font-semibold border border-slate-700 text-slate-100 hover:bg-slate-800"
                  >
                    Add product
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Recent sales</h2>
              <span className="text-[10px] text-sky-400">📡 Live updates</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Invoice</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Customer</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Location</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Date</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-300">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        No sales yet. Start by creating a new sale in the POS screen.
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className={sale.id.startsWith?.("temp-") ? "bg-sky-950/30" : ""}
                      >
                        <td className="px-3 py-2 text-slate-100">{sale.invoiceNumber}</td>
                        <td className="px-3 py-2 text-slate-300">{sale.customer?.name ?? "Walk-in"}</td>
                        <td className="px-3 py-2 text-slate-300 italic">{sale.location?.name ?? "N/A"}</td>
                        <td className="px-3 py-2 text-slate-400">{new Date(sale.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-100">
                          ${Number(sale.total).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
