"use client";

import { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { addItem, changeQty } from "@/store/cart/cartSlice";
import { createSale } from "@/store/cart/cartThunks";
import { BarcodeScannerComponent } from "./BarcodeScannerComponent";
import { useRealTimeStock } from "./useRealTimeStock";

export function PosClient({ products, customers, location, isAdmin, allLocations }) {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const route = useRouter();
  const cartItems = useSelector((state) => state.cart.items);
  const cartLoading = useSelector((state) => state.cart.loading);
  const cartError = useSelector((state) => state.cart.error);
  const lastSale = useSelector((state) => state.cart.lastSale);
  const stockLevels = useSelector((state) => state.cart.stockLevels);
  const [customerId, setCustomerId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [message, setMessage] = useState(null);

  // Get current location ID from searchParams, fallback to location prop
  const currentLocationId = searchParams?.get("location") || location?.id;

  // Handle location change for admins - update searchParams
  const handleLocationChange = (newLocationId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", newLocationId);
    route.push(`/pos?${params.toString()}`);
  };

  // Enable real-time stock syncing with location context
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const stockSync = useRealTimeStock(productIds, true, currentLocationId);

  function addToCart(productId) {
    dispatch(addItem(productId));
  }

  function changeQtyHandler(productId, delta) {
    dispatch(changeQty({ productId, delta }));
  }

  const detailedCart = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const price = Number(product.salePrice);
        const lineTotal = price * item.quantity;
        return { ...item, product, price, lineTotal };
      })
      .filter((v) => v !== null);
  }, [cartItems, products]);

  const subtotal = detailedCart.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount =
    discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const total = subtotal - discountAmount;

  async function handleSubmit() {
    if (detailedCart.length === 0) {
      setMessage("Add at least one item.");
      return;
    }
    // Prevent duplicate submissions while loading
    if (cartLoading) {
      return;
    }
    setMessage(null);
    try {
      const resultAction = await dispatch(
        createSale({ customerId, discountPercent, locationId: currentLocationId }),
      );
      if (createSale.fulfilled.match(resultAction)) {
        const sale = resultAction.payload.sale;
        setDiscountPercent(0);
        setCustomerId("");
        setMessage(`Sale ${sale.invoiceNumber} completed.`);

        // Immediately refresh stock levels after successful sale
        // Use direct function call instead of setTimeout wrapper
        stockSync.refreshNow();
      } else {
        const errorMessage =
          resultAction.payload || resultAction.error?.message;
        setMessage(errorMessage || "Failed to complete sale.");
      }
    } catch {
      setMessage("Network error completing sale.");
    }
  }

  function mobileLabel(product) {
    const brand = product.metadata?.brand;
    const model = product.metadata?.model;
    if (brand || model) {
      return [brand, model].filter(Boolean).join(" ");
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">POS</h1>
            {isAdmin && allLocations && allLocations.length > 1 ? (
              <div className="mt-2">
                <select
                  value={currentLocationId || ""}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  disabled={stockSync.loading}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
                {stockSync.loading && (
                  <p className="text-xs text-sky-400 mt-1">⟳ Syncing inventory...</p>
                )}
                {stockSync.error && (
                  <p className="text-xs text-red-400 mt-1">⚠ Stock sync error</p>
                )}
              </div>
            ) : (
              location && (
                <p className="text-xs text-sky-400 font-medium mt-2">
                  📍 {location.name}
                </p>
              )
            )}
            <p className="text-xs text-slate-400">
              Tap products to build a cart, apply discounts, and complete sales.
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              📡 Real-time stock sync enabled • Updates every 5 seconds
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900"
          >
            Back to dashboard
          </a>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Product catalog
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
              {products.length === 0 ? (
                <p className="text-slate-500">
                  No products yet. Add items on the Products page first.
                </p>
              ) : (
                products.map((product) => {
                  const label = mobileLabel(product);

                  // Get real-time stock from Redux if available, otherwise use initial product stock data
                  const realtimeStockInfo = stockLevels[product.id];
                  let quantity = 0;
                  let alertThreshold = product.lowStockAlert;
                  let trackStock = product.trackStock;

                  if (realtimeStockInfo) {
                    // Use real-time data from polling
                    quantity = realtimeStockInfo.totalStock ?? 0;
                    alertThreshold = realtimeStockInfo.lowStockAlert ?? product.lowStockAlert;
                    trackStock = realtimeStockInfo.trackStock ?? product.trackStock;
                  } else {
                    // Fallback to initial server-side data
                    const locationStock = product.stocks?.find(
                      (s) => s.locationId === currentLocationId
                    ) || product.stocks?.[0];
                    quantity = locationStock?.quantity ?? 0;
                    if (locationStock?.minQuantity > 0) {
                      alertThreshold = locationStock.minQuantity;
                    }
                  }

                  // Determine stock status based on product settings
                  let stockStatus = "ok";
                  if (!trackStock) {
                    stockStatus = "unknown"; // Don't track stock
                  } else if (quantity <= 0) {
                    stockStatus = "out"; // Out of stock
                  } else if (alertThreshold && quantity <= alertThreshold) {
                    stockStatus = quantity <= Math.ceil(alertThreshold * 0.5) ? "critical" : "low";
                  }

                  const statusColor = {
                    out: "border-red-600 bg-red-950/60 grayscale-[0.5]",
                    critical: "border-red-500 bg-red-950/40",
                    low: "border-yellow-500 bg-yellow-950/40",
                    ok: "border-green-500/50 bg-green-950/20",
                    unknown: "border-slate-800 bg-slate-950/60",
                  }[stockStatus];

                  const statusIcon = {
                    out: "✖",
                    critical: "🔴",
                    low: "🟡",
                    ok: "🟢",
                    unknown: "⚪",
                  }[stockStatus];

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addToCart(product.id)}
                      className={`flex flex-col items-start rounded-lg border ${statusColor} p-3 text-left hover:border-sky-500 hover:bg-slate-900 transition`}
                      disabled={quantity === 0 && trackStock}
                    >
                      <div className="flex items-start justify-between w-full gap-1">
                        <span className="font-medium text-slate-100 flex-1">
                          {product.name}
                        </span>
                        <span className="text-lg">{statusIcon}</span>
                      </div>
                      {label && (
                        <span className="text-[11px] text-slate-400">
                          {label}
                        </span>
                      )}
                      <div className="mt-1 w-full">
                        <span className="text-[11px] text-slate-300">
                          ${Number(product.salePrice).toFixed(2)}
                        </span>
                        {trackStock && (
                          <span className={`text-[10px] block mt-0.5 ${stockStatus === "out" ? "text-red-400 font-bold" : "text-slate-400"}`}>
                            {stockStatus === "out" ? "OUT OF STOCK" : `Stock: ${quantity}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Cart & checkout
            </h2>
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                <BarcodeScannerComponent products={products} locationId={currentLocationId} />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-300">
                  Customer (optional)
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Walk-in</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950">
                <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-medium text-slate-300">
                  Cart items
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto px-3 py-2">
                  {detailedCart.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Tap products on the left to add them to the cart.
                    </p>
                  ) : (
                    detailedCart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-2 rounded-md bg-slate-900/80 px-2 py-1.5"
                      >
                        <div>
                          <p className="text-[11px] font-medium text-slate-100">
                            {item.product.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => changeQtyHandler(item.productId, -1)}
                            className="h-6 w-6 rounded-full border border-slate-700 text-[11px]"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-[11px]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQtyHandler(item.productId, 1)}
                            className="h-6 w-6 rounded-full border border-slate-700 text-[11px]"
                          >
                            +
                          </button>
                        </div>
                        <div className="min-w-16 text-right text-[11px] font-semibold text-slate-100">
                          ${item.lineTotal.toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">Subtotal</p>
                  <p className="text-sm font-semibold text-slate-50">
                    ${subtotal.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-300">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) =>
                      setDiscountPercent(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  {discountAmount > 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      −${discountAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">Total</p>
                <p className="text-lg font-semibold text-slate-50">
                  ${total.toFixed(2)}
                </p>
              </div>

              {(message || cartError || lastSale) && (
                <p className="text-[11px] text-slate-300">
                  {message ||
                    cartError ||
                    (lastSale &&
                      `Sale ${lastSale.invoiceNumber} completed.`)}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                  disabled={cartLoading || detailedCart.length === 0}
                className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cartLoading ? "Processing..." : "Complete sale"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

