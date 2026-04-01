"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const lastFetchedPageRef = useRef(null);

  useEffect(() => {
    if (lastFetchedPageRef.current === page) {
      return;
    }

    lastFetchedPageRef.current = page;
    fetchData(page);
  }, [page]);

  useEffect(() => {
    filterProducts();
  }, [products, search, lowStockOnly]);

  const fetchData = async (pageNumber) => {
    try {
      const [productsRes, suppliersRes, locationsRes] = await Promise.all([
        fetch(`/api/products?page=${pageNumber}&limit=50`),
        fetch("/api/inventory/suppliers?limit=100"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products);
        setTotal(data.pagination.total);
      }
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.suppliers);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let result = products;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      );
    }

    if (lowStockOnly) {
      result = result.filter((p) => p.isLowStock);
    }

    setFiltered(result);
  };

  const getStockStatus = (product) => {
    if (product.totalStock === 0) {
      return { status: "OUT", color: "bg-red-900/30 text-red-300", icon: "✗" };
    } else if (product.isLowStock) {
      return {
        status: "LOW",
        color: "bg-yellow-900/30 text-yellow-300",
        icon: "⚠",
      };
    }
    return { status: "OK", color: "bg-green-900/30 text-green-300", icon: "✓" };
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading products...</div>
      </div>
    );
  }

  const pages = Math.ceil(total / 50);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Product Management</h1>
        <div className="flex gap-2">
          <Link
            href="/products?new=true"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            + New Product
          </Link>
          <Link
            href="/inventory"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Inventory Dashboard
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded text-sm"
          />

          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4"
            />
            <span className="text-sm">Low Stock Only</span>
          </label>

          <button
            onClick={() => {
              setSearch("");
              setLowStockOnly(false);
              setPage(1);
            }}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm mb-4">
        Showing {filtered.length} of {total} products • Page {page} of {pages}
      </p>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filtered.map((product) => {
          const status = getStockStatus(product);
          return (
            <div
              key={product.id}
              className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold">{product.name}</h3>
                  <p className="text-gray-400 text-xs mt-1">SKU: {product.sku || "—"}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${status.color}`}>
                  {status.icon} {status.status}
                </span>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Cost</p>
                  <p className="text-white font-semibold">
                    ${Number(product.costPrice).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Sale</p>
                  <p className="text-white font-semibold">
                    ${Number(product.salePrice).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Stock & Supplier */}
              <div className="bg-gray-800/50 rounded p-2 mb-3 text-xs">
                <p className="text-gray-300">
                  <span className="font-semibold">{product.totalStock}</span> in stock
                </p>
                {product.supplierName !== "—" && (
                  <p className="text-gray-400 mt-1">Supplier: {product.supplierName}</p>
                )}
              </div>

              {/* Locations */}
              {product.stockLocations.length > 0 && (
                <div className="mb-3 text-xs">
                  <p className="text-gray-400 mb-1">Locations:</p>
                  <div className="space-y-1">
                    {product.stockLocations.map((loc) => (
                      <div key={loc.locationId} className="text-gray-300">
                        {loc.locationName}: <span className="font-semibold">{loc.quantity}</span>
                        {loc.minQuantity ? (
                          <span className="text-gray-500"> (min: {loc.minQuantity})</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs text-center"
                >
                  View
                </Link>
                <Link
                  href={`/inventory/adjustments?product=${product.id}`}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs text-center"
                >
                  Adjust Stock
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No products found. Try adjusting your filters.
        </div>
      )}

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
