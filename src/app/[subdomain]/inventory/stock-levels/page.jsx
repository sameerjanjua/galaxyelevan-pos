"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function StockLevels() {
  const [stocks, setStocks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    filterStocks();
  }, [stocks, status, search]);

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/inventory/stock/current");
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterStocks = () => {
    let result = stocks;

    // Filter by status
    if (status !== "ALL") {
      result = result.filter((s) => s.status === status);
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.product.name.toLowerCase().includes(q) ||
          s.product.sku?.toLowerCase().includes(q) ||
          s.location.name.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  };

  const handleEdit = (stock) => {
    setEditingId(stock.id);
    setEditValue(stock.minQuantity.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = async (stock) => {
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/stock/min-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: stock.product.id,
          locationId: stock.location.id,
          minQuantity: parseInt(editValue) || 0,
        }),
      });

      if (res.ok) {
        // Refresh data
        await fetchStocks();
        setEditingId(null);
        setEditValue("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update minimum stock level");
      }
    } catch (error) {
      console.error("Error saving min quantity:", error);
      alert("Network error updating minimum stock level");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CRITICAL":
        return "bg-red-900/30 text-red-300 border border-red-700";
      case "WARNING":
        return "bg-yellow-900/30 text-yellow-300 border border-yellow-700";
      default:
        return "bg-green-900/30 text-green-300 border border-green-700";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading stock levels...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Stock Levels</h1>
        <Link
          href="/inventory"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by product or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="OK">OK</option>
          </select>

          <button
            onClick={fetchStocks}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm mb-4">
        Showing {filtered.length} of {stocks.length} items
      </p>

      {/* Stock Table */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-left py-3 px-4">SKU</th>
                <th className="text-left py-3 px-4">Location</th>
                <th className="text-right py-3 px-4">Current</th>
                <th className="text-right py-3 px-4">Minimum</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((stock) => (
                  <tr
                    key={stock.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4 font-semibold">
                      {stock.product.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {stock.product.sku || "—"}
                    </td>
                    <td className="py-3 px-4">{stock.location.name}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {stock.quantity}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingId === stock.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-gray-800 border border-blue-500 text-white px-2 py-1 rounded w-20 outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(stock);
                              if (e.key === "Escape") handleCancel();
                            }}
                          />
                          <button
                            onClick={() => handleSave(stock)}
                            disabled={saving}
                            className="text-green-400 hover:text-green-300 disabled:opacity-50"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span>{stock.minQuantity}</span>
                          <button
                            onClick={() => handleEdit(stock)}
                            className="text-gray-500 hover:text-blue-400 transition-colors"
                            title="Edit Minimum"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                          stock.status
                        )}`}
                      >
                        {stock.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/inventory/adjustments?product=${stock.product.id}&location=${stock.location.id}`}
                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                        >
                          Adjust
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400">
                    No stock items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
