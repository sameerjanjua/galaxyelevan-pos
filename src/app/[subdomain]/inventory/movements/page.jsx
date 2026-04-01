"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const INITIAL_FETCH_DEDUPE_MS = 1200;
let lastInitialFetchAt = 0;

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Deduplicate only rapid duplicate initial fetches from Strict Mode remounts.
    if (type === "ALL" && page === 1) {
      const now = Date.now();
      if (now - lastInitialFetchAt < INITIAL_FETCH_DEDUPE_MS) {
        return;
      }
      lastInitialFetchAt = now;
    }

    fetchMovements();
  }, [type, page]);

  useEffect(() => {
    filterMovements();
  }, [movements]);

  const fetchMovements = async () => {
    try {
      const query = new URLSearchParams({
        page,
        limit: 50,
        ...(type !== "ALL" && { type }),
      });

      const res = await fetch(`/api/inventory/stock/movements?${query}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterMovements = () => {
    setFiltered(movements);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "SALE":
        return "bg-red-900/30 text-red-300";
      case "RETURN":
        return "bg-orange-900/30 text-orange-300";
      case "PURCHASE":
        return "bg-green-900/30 text-green-300";
      case "ADJUSTMENT":
        return "bg-blue-900/30 text-blue-300";
      case "TRANSFER_OUT":
        return "bg-purple-900/30 text-purple-300";
      case "TRANSFER_IN":
        return "bg-indigo-900/30 text-indigo-300";
      default:
        return "bg-gray-900/30 text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading movements...</div>
      </div>
    );
  }

  const pages = Math.ceil(total / 50);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Stock Movement History</h1>
        <Link
          href="/inventory"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-700  rounded-lg p-4 mb-6">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm"
        >
          <option value="ALL">All Types</option>
          <option value="SALE">Sale</option>
          <option value="RETURN">Return</option>
          <option value="PURCHASE">Purchase</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="TRANSFER_OUT">Transfer Out</option>
          <option value="TRANSFER_IN">Transfer In</option>
        </select>
      </div>

      {/* Results */}
      <p className="text-gray-400 text-sm mb-4">
        Total: {total} movements • Page {page} of {pages}
      </p>

      {/* Movements Table */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-right py-3 px-4">Qty</th>
                <th className="text-left py-3 px-4">Location</th>
                <th className="text-left py-3 px-4">By</th>
                <th className="text-left py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(
                          m.type
                        )}`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold">{m.product.name}</div>
                        <div className="text-xs text-gray-400">
                          {m.product.sku}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </td>
                    <td className="py-3 px-4">{m.location.name}</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{m.user.fullName}</div>
                      <div className="text-gray-400">{m.user.email}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {m.notes || m.reference || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400">
                    No movements found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white px-3 py-2 rounded text-sm"
          >
            Previous
          </button>
          <span className="flex items-center text-gray-400 text-sm">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage(Math.min(pages, page + 1))}
            disabled={page === pages}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white px-3 py-2 rounded text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
