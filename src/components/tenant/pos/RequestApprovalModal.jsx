"use client";

import { useState } from "react";

export function RequestApprovalModal({
  isOpen,
  onClose,
  onSend,
  subtotal,
  total,
}) {
  const [bulkReason, setBulkReason] = useState("Loyalty Discount");
  const [customReason, setCustomReason] = useState("");

  const DISCOUNT_REASONS = [
    "Loyalty Discount",
    "Damaged Item",
    "Price Match",
    "Clearance",
    "Staff Choice",
    "Student/Military",
    "Promotion",
    "Other (Custom Reasoning)"
  ];

  if (!isOpen) return null;

  const handleSend = () => {
    const finalReason = bulkReason === "Other (Custom Reasoning)" 
      ? `Custom: ${customReason}` 
      : bulkReason;
    
    onSend(finalReason);
    onClose();
    setCustomReason("");
    setBulkReason("Loyalty Discount");
  };

  const discountAmount = subtotal - total;
  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header - Fixed */}
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex-none">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20 text-amber-400">
                🛡️
             </div>
             <h2 className="text-2xl font-black text-white leading-tight">
               Authorization Required
             </h2>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">
            Manager override request for current order
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
           {/* Preview Summary */}
           <div className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                 <span className="font-bold text-slate-500 uppercase tracking-tighter">Current Subtotal</span>
                 <span className="font-black text-slate-300">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="font-bold text-rose-400 uppercase tracking-tighter">Requested Discount</span>
                 <span className="font-black text-rose-400">-${discountAmount.toFixed(2)} ({discountPercent.toFixed(1)}%)</span>
              </div>
              <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                 <span className="text-sm font-black text-white uppercase tracking-widest">Modified Total</span>
                 <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    ${total.toFixed(2)}
                 </span>
              </div>
           </div>

           {/* Input Section */}
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 leading-none">Primary Reason</label>
                 <select 
                   value={bulkReason}
                   onChange={(e) => setBulkReason(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-2xl px-5 py-4 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none cursor-pointer"
                 >
                   {DISCOUNT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
              </div>

              {bulkReason === "Other (Custom Reasoning)" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 leading-none">Detailed Justification</label>
                   <textarea
                     value={customReason}
                     onChange={(e) => setCustomReason(e.target.value)}
                     placeholder="Why is this override necessary? (e.g. VIP client, bulk pricing mistake)"
                     className="w-full h-32 bg-black/40 border border-white/10 text-white text-sm rounded-2xl px-5 py-4 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none font-medium placeholder:text-slate-700"
                   />
                </div>
              )}
           </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4 flex-none">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-black rounded-[2rem] border border-white/5 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={bulkReason === "Other (Custom Reasoning)" && !customReason.trim()}
            className="flex-[2] py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-[2rem] shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] uppercase tracking-widest disabled:opacity-50"
          >
            Send to Manager
          </button>
        </div>
      </div>
    </div>
  );
}
