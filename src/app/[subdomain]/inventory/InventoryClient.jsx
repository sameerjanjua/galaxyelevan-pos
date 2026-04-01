"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export function InventoryClient({
  initialAlerts,
  initialValuation,
  initialMovements,
  tenantId,
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [valuation, setValuation] = useState(initialValuation);
  const [movements, setMovements] = useState(initialMovements);
  const [liveAlert, setLiveAlert] = useState(null);

  const { emit, on, off } = useSocket(`subscribe-inventory`);

  useEffect(() => {
    if (emit) {
      emit("subscribe-inventory", tenantId);
    }
  }, [emit, tenantId]);

  useEffect(() => {
    // Listen for stock updates
    const handleStockUpdated = (data) => {
      if (data) {
        // Update valuation
        setValuation((prev) => ({
          ...prev,
          summary: {
            ...prev?.summary,
            totalValue:
              (prev?.summary?.totalValue || 0) +
              (data.quantity * data.unitPrice || 0),
          },
        }));

        // Add to movements
        setMovements((prev) => {
          const newMovement = {
            id: `temp-${Date.now()}`,
            createdAt: new Date(),
            type: data.type,
            product: { name: data.productName },
            quantity: Math.abs(data.quantity),
            location: { name: data.locationName || "Unknown" },
            user: { fullName: "System" },
          };
          return [newMovement, ...prev.slice(0, 9)];
        });
      }
    };

    // Listen for low stock alerts
    const handleLowStockAlert = (data) => {
      if (data) {
        setLiveAlert(
          `⚠️ Low stock: ${data.productName} (${data.currentQty}/${data.threshold})`
        );
        setTimeout(() => setLiveAlert(null), 5000);

        setAlerts((prev) => ({
          ...prev,
          summary: {
            criticalCount:
              data.currentQty <= Math.ceil(data.threshold * 0.5)
                ? (prev?.summary?.criticalCount || 0) + 1
                : prev?.summary?.criticalCount || 0,
            warningCount:
              data.currentQty > Math.ceil(data.threshold * 0.5) &&
              data.currentQty <= data.threshold
                ? (prev?.summary?.warningCount || 0) + 1
                : prev?.summary?.warningCount || 0,
          },
        }));
      }
    };

    on(SOCKET_EVENTS.STOCK_UPDATED, handleStockUpdated);
    on(SOCKET_EVENTS.LOW_STOCK_ALERT, handleLowStockAlert);

    return () => {
      off(SOCKET_EVENTS.STOCK_UPDATED);
      off(SOCKET_EVENTS.LOW_STOCK_ALERT);
    };
  }, [on, off]);

  const criticalCount = alerts?.summary?.criticalCount || 0;
  const warningCount = alerts?.summary?.warningCount || 0;
  const totalValue = valuation?.summary?.totalValue || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Live alert */}
      {liveAlert && (
        <div className="fixed top-4 right-4 rounded-lg bg-yellow-600 text-white px-4 py-2 shadow-lg">
          {liveAlert}
        </div>
      )}

      <h1 className="text-3xl font-bold text-white mb-8">Inventory Management</h1>

      {/* Alerts Section */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <h2 className="text-red-400 font-semibold mb-2">⚠️ Low Stock Alerts</h2>
          <p className="text-red-300 text-sm mb-3">
            {criticalCount} critical items • {warningCount} warning items
          </p>
          <Link
            href="/inventory/stock-levels"
            className="text-red-400 hover:text-red-300 text-sm underline"
          >
            View all alerts →
          </Link>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
          <h3 className="text-blue-400 text-sm font-semibold">
            Total Inventory Value
          </h3>
          <p className="text-white text-2xl font-bold mt-2">
            ${totalValue.toFixed(2)}
          </p>
          <p className="text-blue-300 text-xs mt-2">
            Stock valuation at cost price
          </p>
        </div>

        <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
          <h3 className="text-green-400 text-sm font-semibold">
            Critical Stock Items
          </h3>
          <p className="text-white text-2xl font-bold mt-2">{criticalCount}</p>
          <p className="text-green-300 text-xs mt-2">
            Needs immediate attention
          </p>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
          <h3 className="text-yellow-400 text-sm font-semibold">
            Warning Items
          </h3>
          <p className="text-white text-2xl font-bold mt-2">{warningCount}</p>
          <p className="text-yellow-300 text-xs mt-2">Below 1.5x threshold</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-8">
        <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/inventory/stock-levels"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            View Stock Levels
          </Link>
          <Link
            href="/inventory/adjustments"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            Manual Adjustment
          </Link>
          <Link
            href="/inventory/transfers"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
          >
            Transfer Stock
          </Link>
          <Link
            href="/inventory/reports"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm"
          >
            View Reports
          </Link>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Stock Movements</h2>
          <span className="text-[10px] text-sky-400">📡 Live updates</span>
        </div>
        {movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Product</th>
                  <th className="text-left py-2 px-2">Qty</th>
                  <th className="text-left py-2 px-2">Location</th>
                  <th className="text-left py-2 px-2">User</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                      m.id.startsWith("temp-") ? "bg-sky-950/30" : ""
                    }`}
                  >
                    <td className="py-2 px-2 text-xs">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          m.type === "SALE"
                            ? "bg-red-900/50 text-red-300"
                            : m.type === "PURCHASE"
                              ? "bg-green-900/50 text-green-300"
                              : "bg-blue-900/50 text-blue-300"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2 px-2">{m.product.name}</td>
                    <td className="py-2 px-2">{m.quantity}</td>
                    <td className="py-2 px-2">{m.location.name}</td>
                    <td className="py-2 px-2 text-xs text-gray-400">
                      {m.user.fullName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No stock movements yet</p>
        )}
      </div>
    </div>
  );
}
