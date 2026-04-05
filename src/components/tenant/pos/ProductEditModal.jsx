"use client";

import { useState, useEffect } from "react";

export function ProductEditModal({
  isOpen,
  item,
  onClose,
  onSave,
  disabled = false,
}) {
  const [price, setPrice] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("PERCENT");

  useEffect(() => {
    if (item && isOpen) {
      setPrice(item.price);
      setDiscountValue(item.discountValue || 0);
      setDiscountType(item.discountType || "PERCENT");
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    // Validation Guardrails
    const finalPrice = Math.max(0, Number(price) || 0);
    let finalDiscount = Math.max(0, Number(discountValue) || 0);
    
    if (discountType === "PERCENT") {
      finalDiscount = Math.min(100, finalDiscount);
    } else {
      finalDiscount = Math.min(finalPrice, finalDiscount);
    }

    onSave({
      productId: item.productId,
      price: finalPrice,
      discountType,
      discountValue: finalDiscount,
    });
    onClose();
  };

  const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 50];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5">
          <div className="flex justify-between items-start mb-1">
            <h2 className="text-xl font-black text-white leading-tight">
              Edit Item
            </h2>
            <button 
              onClick={onClose} 
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm font-bold text-sky-400">{item.product?.name}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Price Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unit Price</label>
              <span className="text-[10px] font-bold text-slate-500">Original: ${item.originalPrice?.toFixed(2)}</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={disabled}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-2xl font-black text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
              />
              {Number(price) !== item.originalPrice && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-amber-500/20 rounded-lg border border-amber-500/30">
                   <span className="text-[10px] font-black text-amber-500 uppercase">Override</span>
                </div>
              )}
            </div>
          </div>

          {/* Discount Section */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discount</label>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setDiscountType("PERCENT")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${discountType === "PERCENT" ? "bg-rose-500 text-white shadow-lg" : "text-slate-500"}`}
                  >
                    %
                  </button>
                  <button 
                    onClick={() => setDiscountType("AMOUNT")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${discountType === "AMOUNT" ? "bg-rose-500 text-white shadow-lg" : "text-slate-500"}`}
                  >
                    $
                  </button>
                </div>
             </div>
             <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={disabled}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-2xl font-black text-white focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all"
                placeholder="0"
              />
              
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                 {DISCOUNT_PRESETS.map(p => (
                   <button
                    key={p}
                    onClick={() => {
                        setDiscountType("PERCENT");
                        setDiscountValue(p);
                    }}
                    className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                   >
                     {p}%
                   </button>
                 ))}
                 <button
                    onClick={() => setDiscountValue(0)}
                    className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-black text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95"
                 >
                   Clear
                 </button>
              </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={disabled}
            className="flex-1 py-4 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-xl shadow-sky-500/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
