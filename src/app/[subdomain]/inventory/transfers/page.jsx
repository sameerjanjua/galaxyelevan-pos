"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useActiveLocation } from "@/lib/useActiveLocation";

export default function StockTransfers() {
  const user = useSelector((state) => state.auth.user);
  const { activeLocationId } = useActiveLocation();

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [formData, setFormData] = useState({
    productId: "",
    fromLocationId: "",
    toLocationId: "",
    quantity: "",
    notes: "",
  });
  const [fromStock, setFromStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;
    fetchData();
  }, []);

  // Sync activeLocationId changes down to form if it isn't set yet or user explicitly changed context
  useEffect(() => {
    if (activeLocationId) {
      setFormData(prev => ({ ...prev, fromLocationId: activeLocationId }));
    } else if (user?.role === "MANAGER" && user?.locationId && locations.length > 0) {
      setFormData((prev) => ({ ...prev, fromLocationId: user.locationId }));
    }
  }, [activeLocationId, user, locations]);

  useEffect(() => {
    checkFromStock();
  }, [formData.productId, formData.fromLocationId]);

  const fetchData = async () => {
    try {
      const [productsRes, locationsRes, stocksRes] = await Promise.all([
        fetch("/api/tenant/products"),
        fetch("/api/tenant/locations"),
        fetch("/api/tenant/inventory/stock/current"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.locations || []);
      }
      if (stocksRes.ok) {
        const data = await stocksRes.json();
        setStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkFromStock = () => {
    if (!formData.productId || !formData.fromLocationId) {
      setFromStock(null);
      return;
    }

    const stock = stocks.find(
      (s) => s.productId === formData.productId && s.locationId === formData.fromLocationId
    );

    setFromStock(stock?.quantity || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.productId ||
      !formData.fromLocationId ||
      !formData.toLocationId ||
      !formData.quantity
    ) {
      setMessage("All fields are required");
      return;
    }

    if (formData.fromLocationId === formData.toLocationId) {
      setMessage("Source and destination must be different");
      return;
    }

    if (parseInt(formData.quantity) > (fromStock || 0)) {
      setMessage(`Insufficient stock. Available: ${fromStock}`);
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/tenant/inventory/stock/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formData.productId,
          fromLocationId: formData.fromLocationId,
          toLocationId: formData.toLocationId,
          quantity: parseInt(formData.quantity),
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`✓ ${data.message}`);
        setFormData({
          productId: "",
          fromLocationId: "",
          toLocationId: "",
          quantity: "",
          notes: "",
        });
        setFromStock(null);
      } else {
        const error = await res.json();
        setMessage(`✗ ${error.error}`);
      }
    } catch (error) {
      setMessage("Error processing transfer");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const fromLocation = locations.find((l) => l.id === formData.fromLocationId);
  const toLocation = locations.find((l) => l.id === formData.toLocationId);
  const selectedProduct = products.find((p) => p.id === formData.productId);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Stock Transfer</h1>
        <Link href="/inventory" className="text-blue-400 hover:text-blue-300 text-sm">
          Back to Dashboard
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900/50 border border-gray-700 rounded-lg p-6"
      >
        {/* Product Selection */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">Product</label>
          <select
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {/* From Location */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">
            From Location
          </label>
          <select
            value={formData.fromLocationId}
            onChange={(e) =>
              setFormData({ ...formData, fromLocationId: e.target.value })
            }
            disabled={user?.role === "MANAGER" && !!user?.locationId}
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select source location...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* From Stock Display */}
        {fromStock !== null && (
          <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded p-4">
            <p className="text-blue-300 text-sm">
              Available at {fromLocation?.name}: {fromStock} units
            </p>
          </div>
        )}

        {/* To Location */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">
            To Location
          </label>
          <select
            value={formData.toLocationId}
            onChange={(e) =>
              setFormData({ ...formData, toLocationId: e.target.value })
            }
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="">Select destination location...</option>
            {locations
              .filter((l) => l.id !== formData.fromLocationId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">
            Quantity to Transfer
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="How many units to move?"
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Reason for transfer (optional)"
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded h-20"
          />
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded text-sm ${
              message.startsWith("✓")
                ? "bg-green-900/30 border border-green-700 text-green-300"
                : "bg-red-900/30 border border-red-700 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* Confirmation */}
        {selectedProduct && fromLocation && toLocation && formData.quantity && (
          <div className="mb-6 bg-purple-900/30 border border-purple-700 rounded p-4">
            <p className="text-purple-300 font-semibold text-sm">Transfer:</p>
            <p className="text-purple-200 text-sm mt-2">
              {formData.quantity} × {selectedProduct.name}
            </p>
            <p className="text-purple-200 text-sm">
              {fromLocation.name} → {toLocation.name}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            submitting ||
            !formData.productId ||
            !formData.fromLocationId ||
            !formData.toLocationId ||
            !formData.quantity
          }
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded"
        >
          {submitting ? "Processing..." : "Confirm Transfer"}
        </button>
      </form>
    </div>
  );
}
