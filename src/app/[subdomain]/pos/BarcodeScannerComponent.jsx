"use client";

import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addItem } from "@/store/cart/cartSlice";

export function BarcodeScannerComponent({ products, locationId }) {
  const dispatch = useDispatch();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannerMessage, setScannerMessage] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on mount and keep focus
    inputRef.current?.focus();
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const input = barcodeInput.trim();

    // First, try to find product locally by barcode or SKU
    const localProduct = products.find(
      (p) => p.barcode === input || p.sku === input
    );
    if (localProduct) {
      dispatch(addItem(localProduct.id));
      setScannerMessage(
        `✓ Added: ${localProduct.name} (${localProduct.sku || "no SKU"})`
      );
      setBarcodeInput("");
      setTimeout(() => setScannerMessage(null), 3000);
      inputRef.current?.focus();
      return;
    }

    // If not found locally, query the API by barcode first, then by SKU
    setIsLookingUp(true);
    try {
      // Build URL with locationId parameter
      const buildUrl = (param, value) => {
        const url = new URL(`/api/tenant/products/lookup`, window.location.origin);
        url.searchParams.append(param, value);
        if (locationId) {
          url.searchParams.append("locationId", locationId);
        }
        return url.toString();
      };

      // Try barcode first, then SKU
      let response = await fetch(buildUrl("barcode", input));

      if (!response.ok) {
        response = await fetch(buildUrl("sku", input));
      }

      if (response.ok) {
        const data = await response.json();
        const product = data.product;

        // Validate product is in current location's product list
        const existingProduct = products.find((p) => p.id === product.id);
        if (!existingProduct) {
          setScannerMessage("✗ Product not available at this location");
          setBarcodeInput("");
          setTimeout(() => setScannerMessage(null), 3000);
          inputRef.current?.focus();
          return;
        }

        dispatch(addItem(existingProduct.id));
        setScannerMessage(
          `✓ Added: ${product.name} (Stock: ${product.totalStock})`
        );
        setBarcodeInput("");
      } else {
        setScannerMessage("✗ Product not found");
      }
    } catch (error) {
      setScannerMessage("✗ Lookup error");
      console.error("Barcode lookup error:", error);
    } finally {
      setIsLookingUp(false);
      setTimeout(() => setScannerMessage(null), 3000);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleBarcodeSubmit} className="space-y-2">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-300">
          📱 Scan barcode or enter SKU
        </label>
        <input
          ref={inputRef}
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="Scan or type barcode..."
          disabled={isLookingUp}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
          autoComplete="off"
        />
      </div>

      {scannerMessage && (
        <p
          className={`text-[11px] ${
            scannerMessage.startsWith("✓")
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {scannerMessage}
        </p>
      )}

      {isLookingUp && (
        <p className="text-[11px] text-slate-400">Looking up product...</p>
      )}
    </form>
  );
}
