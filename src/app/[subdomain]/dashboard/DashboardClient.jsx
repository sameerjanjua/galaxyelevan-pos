"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";
import { useSelector } from "react-redux";

export function DashboardClient({
  initialRecentSales,
  initialTotalRevenue,
  initialTotalSales,
  tenantId,
  locationId,
  user
}) {
  const [recentSales, setRecentSales] = useState(initialRecentSales);
  const [totalRevenue, setTotalRevenue] = useState(initialTotalRevenue);
  const [totalSales, setTotalSales] = useState(initialTotalSales);
  const [newSaleNotification, setNewSaleNotification] = useState(null);

  const { emit, on, off } = useSocket(`subscribe-dashboard`);

  useEffect(() => {
    // Subscribe to dashboard channel
    if (emit) {
      emit("subscribe-dashboard", { tenantId, locationId });
    }
  }, [emit, tenantId, locationId]);

  useEffect(() => {
    // Listen for sale completed events
    const handleSaleCompleted = (data) => {
      // If locationId is present (MANAGER/STAFF), only show notifications for that location
      if (locationId && data.locationId !== locationId) {
        return;
      }

      if (data) {
        setNewSaleNotification(`Sale ${data.invoiceNumber} completed`);
        setTimeout(() => setNewSaleNotification(null), 5000);

        // Add to recent sales
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

        // Increment total sales count
        setTotalSales((prev) => prev + 1);
      }
    };

    // Listen for revenue updates
    const handleRevenueUpdate = (data) => {
      // If locationId is present, only update revenue for that location
      if (locationId && data.locationId !== locationId) {
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
  }, [on, off]);

  return (
    <>
      {/* Real-time notification */}
      {newSaleNotification && (
        <div className="fixed top-4 right-4 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg animation-fadeInOut">
          ✓ {newSaleNotification}
        </div>
      )}

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
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Invoice
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Customer
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Location
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Date
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-300">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No sales yet. Start by creating a new sale in the POS screen.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={sale.id.startsWith("temp-") ? "bg-sky-950/30" : ""}
                  >
                    <td className="px-3 py-2 text-slate-100">
                      {sale.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {sale.customer?.name ?? "Walk-in"}
                    </td>
                    <td className="px-3 py-2 text-slate-300 italic">
                      {sale.location?.name ?? "N/A"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
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
  );
}
