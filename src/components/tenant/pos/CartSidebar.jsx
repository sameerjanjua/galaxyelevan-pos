import { useEffect, useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";

export function CartSidebar({
  detailedCart,
  customers,
  customerId,
  setCustomerId,
  changeQtyHandler,
  handleSetItemDiscount,
  subtotal,
  globalDiscountValue,
  setGlobalDiscountValue,
  globalDiscountType,
  setGlobalDiscountType,
  globalDiscountAmount,
  total,
  handleSubmit,
  cartLoading,
  hideScrollbarStyle,
  products,
  effectiveLocationId,
}) {
  const [expandedDiscountProductId, setExpandedDiscountProductId] = useState(null);

  // Sync: Reset local UI states when the active item is removed from the cart
  useEffect(() => {
    if (expandedDiscountProductId) {
      const exists = detailedCart.some((i) => i.productId === expandedDiscountProductId);
      if (!exists) {
        setExpandedDiscountProductId(null);
      }
    }
  }, [detailedCart, expandedDiscountProductId]);

  return (
    <section className="flex flex-col h-full bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* subtle gradient glow behind the cart */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex-none p-5 pb-3 z-10 border-b border-white/5">
        <h2 className="text-base font-bold text-slate-100 flex items-center justify-between">
          Current Order
          <span className="bg-sky-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            {detailedCart.length} ITEMS
          </span>
        </h2>
      </div>

      {/* Barcode & Customer Entry */}
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

      {/* Cart Items Tunnel */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-2 z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-sky-500/30"
      >
        {detailedCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <svg
              className="w-10 h-10 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-xs font-semibold">Cart is empty</p>
            <p className="text-[10px] mt-1 text-center">
              Scan a barcode or tap <br /> a product to begin.
            </p>
          </div>
        ) : (
          detailedCart.map((item) => (
            <div
              key={item.productId}
              className="group flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 hover:border-white/10"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-100 flex-1 leading-tight">
                  {item.product.name}
                </p>
                <p className="text-xs font-extrabold text-slate-100 min-w-[50px] text-right">
                  ${item.lineTotal.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-medium">
                  ${item.price.toFixed(2)} / ea
                  {item.lineDiscountAmount > 0 && (
                    <span className="text-rose-400 ml-1 block mt-0.5">
                      (-${item.lineDiscountAmount.toFixed(2)})
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDiscountProductId((p) =>
                        p === item.productId ? null : item.productId
                      )
                    }
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors border ${
                      expandedDiscountProductId === item.productId || item.discountValue > 0
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Disc
                  </button>
                  <div className="flex items-center gap-2 bg-black/30 rounded-full p-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => changeQtyHandler(item.productId, -1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 text-slate-300 hover:bg-white/20 hover:text-white transition-colors text-xs font-medium"
                    >
                      -
                    </button>
                    <span className="w-4 text-center text-[10px] font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQtyHandler(item.productId, 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 text-slate-300 hover:bg-white/20 hover:text-white transition-colors text-xs font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {expandedDiscountProductId === item.productId && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                    Discount
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex bg-black/40 rounded border border-white/10 p-[2px]">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetItemDiscount(
                            item.productId,
                            "PERCENT",
                            item.discountValue
                          )
                        }
                        className={`px-1.5 py-0.5 text-[9px] rounded-sm font-bold ${
                          item.discountType === "PERCENT"
                            ? "bg-rose-500/20 text-rose-300"
                            : "text-slate-500"
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSetItemDiscount(
                            item.productId,
                            "AMOUNT",
                            item.discountValue
                          )
                        }
                        className={`px-1.5 py-0.5 text-[9px] rounded-sm font-bold ${
                          item.discountType === "AMOUNT"
                            ? "bg-rose-500/20 text-rose-300"
                            : "text-slate-500"
                        }`}
                      >
                        $
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={item.discountValue || ""}
                      onChange={(e) =>
                        handleSetItemDiscount(
                          item.productId,
                          item.discountType,
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-14 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-right text-white focus:border-rose-500/50 outline-none placeholder:text-slate-700"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Checkout Footer block */}
      <div className="flex-none bg-black/40 backdrop-blur-xl p-5 border-t border-white/10 z-20">
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Subtotal</span>
            <span className="text-slate-200">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400 font-medium">Discount</span>
            <div className="flex items-center gap-2">
              <div className="flex bg-black/40 rounded-lg border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setGlobalDiscountType("PERCENT")}
                  className={`px-2 py-1 text-[10px] rounded uppercase font-bold transition-colors ${
                    globalDiscountType === "PERCENT"
                      ? "bg-rose-500/20 text-rose-300 shadow"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalDiscountType("AMOUNT")}
                  className={`px-2 py-1 text-[10px] rounded uppercase font-bold transition-colors ${
                    globalDiscountType === "AMOUNT"
                      ? "bg-rose-500/20 text-rose-300 shadow"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  $
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={globalDiscountValue || ""}
                  onChange={(e) =>
                    setGlobalDiscountValue(Number(e.target.value) || 0)
                  }
                  className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-right font-medium text-white appearance-none outline-none focus:border-rose-500/50"
                  placeholder="0"
                />
              </div>
              {globalDiscountAmount > 0 ? (
                <span className="text-rose-400 text-xs font-bold w-12 text-right">
                  -${globalDiscountAmount.toFixed(2)}
                </span>
              ) : (
                <span className="text-transparent text-xs font-bold w-12 text-right">
                  $0.00
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-end justify-between">
            <span className="text-sm font-semibold text-slate-300 mb-0.5">
              Total
            </span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={cartLoading || detailedCart.length === 0}
          className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-xl transition-all duration-300 active:scale-[0.98]
            ${
              cartLoading || detailedCart.length === 0
                ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-sky-500 text-white hover:bg-sky-400 border border-sky-400 shadow-sky-500/20"
            }
          `}
        >
          {cartLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </span>
          ) : (
            "Complete Order"
          )}
        </button>
      </div>
    </section>
  );
}
