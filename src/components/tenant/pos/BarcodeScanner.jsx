"use client";

import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addItem } from "@/store/cart/cartSlice";
import { toast } from "sonner";

export function BarcodeScanner({ products, locationId }) {
  const dispatch = useDispatch();
  const [barcodeInput, setBarcodeInput] = useState("");
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
      toast.success(`Fast Added: ${localProduct.name} (${localProduct.sku || "no SKU"})`);
      setBarcodeInput("");
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
          toast.error("Item not listed in this location");
          setBarcodeInput("");
          inputRef.current?.focus();
          return;
        }

        dispatch(addItem(existingProduct.id));
        toast.success(`Deep Added: ${product.name} (Stock: ${product.totalStock})`);
        setBarcodeInput("");
      } else {
        toast.error("Barcode not recognized");
        setBarcodeInput("");
      }
    } catch (error) {
      toast.error("Lookup network error");
      console.error("Barcode lookup error:", error);
    } finally {
      setIsLookingUp(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleBarcodeSubmit} className="space-y-1.5 relative w-full group">
      <div>
        <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase text-slate-400">
          <span className="inline-block mr-1">📱</span> Scanner / SKU
        </label>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan or type barcode..."
            disabled={isLookingUp}
            className="w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 py-2 text-xs font-medium text-white transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50 appearance-none placeholder:text-slate-600 focus:outline-none"
            autoComplete="off"
          />
          {/* Decorative scanning line icon in absolute left */}
          <div className="absolute left-3 animate-pulse opacity-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
              <line x1="7" y1="12" x2="17" y2="12"></line>
            </svg>
          </div>
          
          {/* Loading spinner when deep searching */}
          {isLookingUp && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
