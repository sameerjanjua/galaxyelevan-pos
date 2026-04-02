"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useActiveLocation } from "@/lib/useActiveLocation";

export default function AdjustmentsForm() {
  const searchParams = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  
  const isOwner = user?.role === "OWNER";
  const isGlobalManager = user?.role === "MANAGER" && !user?.locationId;
  const canSelectLocation = isOwner || isGlobalManager;
  
  const { activeLocationId } = useActiveLocation();

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    productId: searchParams?.get("product") || "",
    locationId: searchParams?.get("location") || activeLocationId || user?.locationId || "",
    quantity: "",
    type: "CORRECTION",
    notes: "",
  });
  const [currentStock, setCurrentStock] = useState(null);
  const [projectedStock, setProjectedStock] = useState(null);
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
    if (activeLocationId && !formData.locationId) {
      setFormData(prev => ({ ...prev, locationId: activeLocationId }));
    }
  }, [activeLocationId]);

  useEffect(() => {
    if (!canSelectLocation && user?.locationId) {
      setFormData((prev) => ({ ...prev, locationId: user.locationId }));
    }
  }, [user, canSelectLocation]);

  useEffect(() => {
    updateProjection();
  }, [formData.quantity, currentStock]);

  const fetchData = async () => {
    try {
      const [productsRes, locationsRes] = await Promise.all([
        fetch("/api/tenant/products"),
        fetch("/api/tenant/locations"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProjection = async () => {
    if (!formData.productId || !formData.locationId) {
      setCurrentStock(null);
      setProjectedStock(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/tenant/inventory/stock/current?productId=${formData.productId}&locationId=${formData.locationId}`
      );
      if (res.ok) {
        const data = await res.json();
        const stock = data.stocks?.[0];
        if (stock) {
          setCurrentStock(stock.quantity);
          const adj = parseInt(formData.quantity) || 0;
          setProjectedStock(stock.quantity + adj);
        }
      }
    } catch (error) {
      console.error("Error fetching stock:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productId || !formData.locationId || !formData.quantity) {
      setMessage("All fields are required");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/tenant/inventory/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formData.productId,
          locationId: formData.locationId,
          quantity: parseInt(formData.quantity),
          type: formData.type,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(
          `✓ Stock adjusted successfully (ID: ${data.adjustmentId})`
        );
        setFormData({
          productId: "",
          locationId: "",
          quantity: "",
          type: "CORRECTION",
          notes: "",
        });
        setCurrentStock(null);
        setProjectedStock(null);
      } else {
        const error = await res.json();
        setMessage(`✗ ${error.error}`);
      }
    } catch (error) {
      setMessage("Error submitting adjustment");
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

  const selectedProduct = products.find(
    (p) => p.id === formData.productId
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Manual Stock Adjustment</h1>
        <Link
          href="/inventory"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
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

        {/* Location Selection */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">Location</label>
          <select
            value={formData.locationId}
            onChange={(e) =>
              setFormData({ ...formData, locationId: e.target.value })
            }
            disabled={!canSelectLocation}
            className={`w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded ${
              !canSelectLocation ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Select a location...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {!canSelectLocation && user?.locationId && (
            <p className="text-xs text-gray-500 mt-1">
              Location is locked based on your assigned access.
            </p>
          )}
        </div>

        {/* Current Stock Display */}
        {currentStock !== null && (
          <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded p-4">
            <p className="text-blue-300 text-sm">Current Stock: {currentStock}</p>
            {projectedStock !== null && (
              <p className="text-blue-400 font-semibold mt-2">
                After Adjustment: {projectedStock}
              </p>
            )}
          </div>
        )}

        {/* Adjustment Type */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">
            Adjustment Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="CORRECTION">Correction (Count Discrepancy)</option>
            <option value="DAMAGE">Damage/Breakage</option>
            <option value="LOSS">Loss/Theft</option>
            <option value="FOUND">Found/Return</option>
          </select>
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">
            Adjustment Quantity
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="Positive to add, negative to reduce"
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional details (optional)"
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded h-24"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !formData.productId || !formData.locationId || !formData.quantity}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded"
        >
          {submitting ? "Processing..." : "Confirm Adjustment"}
        </button>
      </form>
    </div>
  );
}
