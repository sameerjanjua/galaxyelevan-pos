"use client";

import { useState, useEffect } from "react";

export function GlobalDiscountModal({
  isOpen,
  onClose,
  onApply,
  currentValue,
  currentType,
  subtotal,
  disabled = false,
}) {
  const [value, setValue] = useState(0);
  const [type, setType] = useState("PERCENT");

  useEffect(() => {
    if (isOpen) {
      setValue(currentValue || 0);
      setType(currentType || "PERCENT");
    }
  }, [isOpen, currentValue, currentType]);

  if (!isOpen) return null;

  const handleApply = () => {
    // Validation Guardrails
    let finalValue = Math.max(0, Number(value) || 0);
    
    if (type === "PERCENT") {
      finalValue = Math.min(100, finalValue);
    } else {
      finalValue = Math.min(subtotal, finalValue);
    }

    onApply(type, finalValue);
    onClose();
  };

  const PRESETS = [5, 10, 15, 25, 50];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h2 className="text-xl font-black text-white leading-tight mb-1">
            Global Discount
          </h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">
            Applies to entire sale (Subtotal: ${subtotal?.toFixed(2)})
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Input */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discount Type</label>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setType("PERCENT")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${type === "PERCENT" ? "bg-sky-500 text-white shadow-lg" : "text-slate-500"}`}
                  >
                    %
                  </button>
                  <button 
                    onClick={() => setType("AMOUNT")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${type === "AMOUNT" ? "bg-sky-500 text-white shadow-lg" : "text-slate-500"}`}
                  >
                    $
                  </button>
                </div>
             </div>
             
             <div className="relative">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={disabled}
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-6 text-3xl font-black text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none transition-all text-center"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-700 pointer-events-none opacity-40">
                   {type === "PERCENT" ? "%" : "$"}
                </span>
             </div>
              
              {/* Presets */}
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                 {PRESETS.map(p => (
                   <button
                    key={p}
                    onClick={() => {
                        setType("PERCENT");
                        setValue(p);
                    }}
                    className="px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[11px] font-black text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                   >
                     {p}%
                   </button>
                 ))}
                 <button
                    onClick={() => setValue(0)}
                    className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] font-black text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95"
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
            onClick={handleApply}
            disabled={disabled}
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
}
