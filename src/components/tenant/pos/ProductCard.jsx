export function ProductCard({
  product,
  quantity,
  alertThreshold,
  trackStock,
  onAddToCart,
}) {
  let stockStatus = "ok";
  if (!trackStock) {
    stockStatus = "unknown";
  } else if (quantity <= 0) {
    stockStatus = "out";
  } else if (alertThreshold && quantity <= alertThreshold) {
    stockStatus =
      quantity <= Math.ceil(alertThreshold * 0.5) ? "critical" : "low";
  }

  // Polished Stock Badges
  const badgeStyles = {
    out: "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]",
    critical:
      "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[inset_0_0_8px_rgba(244,63,94,0.1)]",
    low: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[inset_0_0_8px_rgba(245,158,11,0.1)]",
    ok: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    unknown:
      "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  }[stockStatus];

  const isOut = stockStatus === "out";

  function mobileLabel(p) {
    const brand = p.metadata?.brand;
    const model = p.metadata?.model;
    if (brand || model) {
      return [brand, model].filter(Boolean).join(" ");
    }
    return null;
  }
  const label = mobileLabel(product);

  return (
    <button
      type="button"
      onClick={() => onAddToCart(product.id)}
      disabled={quantity === 0 && trackStock}
      className={`group relative flex flex-col justify-between items-start text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98]
        ${
          isOut
            ? "border-white/5 bg-white/[0.02] grayscale opacity-60 cursor-not-allowed"
            : "border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:from-white/10 hover:to-white/5 hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-sky-900/10 hover:-translate-y-0.5"
        }
      `}
    >
      <div className="w-full relative z-10">
        <span className="block font-bold text-slate-100/90 text-sm tracking-tight leading-tight truncate">
          {product.name}
        </span>
        {label ? (
          <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1 truncate">
            {label}
          </span>
        ) : (
          <span className="block h-4 mt-1"></span>
        )}
      </div>

      <div className="mt-5 w-full flex items-end justify-between relative z-10">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            Unit Price
          </span>
          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-300 to-indigo-300 leading-none">
            ${Number(product.salePrice).toFixed(2)}
          </span>
        </div>
        {trackStock && (
          <span
            className={`text-[9px] font-black px-2 py-1 rounded-md ${badgeStyles}`}
          >
            {isOut ? "OUT" : `${quantity} IN`}
          </span>
        )}
      </div>
      
      {/* Decorative inner glow for active elements */}
      {!isOut && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none"></div>
      )}
    </button>
  );
}
