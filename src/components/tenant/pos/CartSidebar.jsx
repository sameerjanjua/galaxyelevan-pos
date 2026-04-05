"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { BarcodeScanner } from "./BarcodeScanner";
import { fetchSingleRequestStatus } from "@/store/approvals/approvalsThunks";
import { toast } from "sonner";

export function CartSidebar({
  detailedCart,
  customers,
  customerId,
  setCustomerId,
  changeQtyHandler,
  subtotal,
  total,
  handleSubmit,
  cartLoading,
  products,
  effectiveLocationId,
  isSaleUnauthorized,
  setEditingItem,
  editingItem,
  onRequestOpen,
  pendingSaleRequest,
  setIsGlobalDiscountOpen,
  globalDiscountValue,
  globalDiscountType,
}) {
  const dispatch = useDispatch();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const onCheckStatus = async () => {
    if (!pendingSaleRequest || isCheckingStatus) return;
    setIsCheckingStatus(true);
    try {
      const result = await dispatch(fetchSingleRequestStatus(pendingSaleRequest.id)).unwrap();
      if (result && result.status !== "PENDING") {
        toast.success(`Request ${result.status.toLowerCase()}!`);
      } else {
        toast.info("Status is still pending. Please wait for the manager.");
      }
    } catch (err) {
      toast.error("Failed to verify status. Try again later.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <section className="flex flex-col h-full bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex-none p-5 pb-3 z-10 border-b border-white/5">
        <h2 className="text-base font-bold text-slate-100 flex items-center justify-between">
          Current Order
          <span className="bg-sky-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            {detailedCart.length} ITEMS
          </span>
        </h2>
      </div>

      <div className="flex-none px-5 py-4 space-y-3 border-b border-white/5 z-10">
        <BarcodeScanner products={products} locationId={effectiveLocationId} />
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-white transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 appearance-none"
        >
          <option value="">Walk-in Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2 z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-sky-500/30">
        {detailedCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-xs font-semibold">Cart is empty</p>
            <p className="text-[10px] mt-1 text-center">Scan a barcode or tap <br /> a product to begin.</p>
          </div>
        ) : (
          detailedCart.map((item) => (
            <div key={item.productId} className="group flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 hover:border-white/10">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-100 flex-1 leading-tight">{item.product.name}</p>
                <p className="text-xs font-extrabold text-slate-100 min-w-[50px] text-right">${item.lineTotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-medium">
                  {item.isPriceOverridden ? <span className="text-amber-400 font-bold line-through mr-1">${item.originalPrice.toFixed(2)}</span> : null}
                  ${item.price.toFixed(2)} / ea
                  {item.lineDiscountAmount > 0 && <span className={`${item.isDiscountOverridden ? 'text-amber-400' : 'text-rose-400'} ml-1 block mt-0.5`}>(-${item.lineDiscountAmount.toFixed(2)})</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingItem(item)} className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors border ${item.isPriceOverridden || item.isDiscountOverridden ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}>Edit</button>
                  <div className="flex items-center gap-2 bg-black/30 rounded-full p-1 border border-white/5">
                    <button onClick={() => changeQtyHandler(item.productId, -1)} className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 text-slate-300 hover:bg-white/20 hover:text-white transition-colors text-xs font-medium">-</button>
                    <span className="w-4 text-center text-[10px] font-bold">{item.quantity}</span>
                    <button onClick={() => changeQtyHandler(item.productId, 1)} className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 text-slate-300 hover:bg-white/20 hover:text-white transition-colors text-xs font-medium">+</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex-none bg-black/40 backdrop-blur-xl p-5 border-t border-white/10 z-20">
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Subtotal</span>
            <span className="text-slate-200">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 group">
            <span className="text-xs text-slate-400 font-medium">Discount</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
                {globalDiscountValue > 0 && (
                  <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full border border-rose-400/20">
                    -{globalDiscountType === "PERCENT" ? `${globalDiscountValue}%` : `$${globalDiscountValue.toFixed(2)}`}
                  </span>
                )}
                <button onClick={() => setIsGlobalDiscountOpen(true)} disabled={!!pendingSaleRequest} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50">Edit</button>
            </div>
          </div>
          <div className="pt-3 border-t border-white/10 flex items-end justify-between">
            <span className="text-sm font-semibold text-slate-300 mb-0.5">Total</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={pendingSaleRequest ? null : isSaleUnauthorized ? onRequestOpen : handleSubmit}
            disabled={cartLoading || detailedCart.length === 0}
            className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-xl transition-all duration-300 active:scale-[0.98]
              ${
                cartLoading || detailedCart.length === 0 ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                : pendingSaleRequest ? "bg-rose-500/20 text-rose-300 border border-rose-500/20 animate-pulse cursor-wait"
                : isSaleUnauthorized ? "bg-amber-500 text-black hover:bg-amber-400 border border-amber-400 shadow-amber-500/20"
                : "bg-sky-500 text-white hover:bg-sky-400 border border-sky-400 shadow-sky-500/20"
              }
            `}
          >
            {cartLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : pendingSaleRequest ? (
              <span className="flex items-center justify-center gap-2">⏳ Waiting for Manager...</span>
            ) : isSaleUnauthorized ? (
              <span className="flex items-center justify-center gap-2">🛡️ Request Authorize Override</span>
            ) : (
              "Complete Order"
            )}
          </button>

          {pendingSaleRequest && (
            <button
              onClick={onCheckStatus}
              disabled={isCheckingStatus}
              className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              {isCheckingStatus ? (
                <div className="w-3 h-3 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
              ) : "🔄"}
              {isCheckingStatus ? "Verifying..." : "Tap to manual check status"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
