"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { resolveApprovalRequest } from "@/store/approvals/approvalsThunks";

export function ApprovalDetailModal({ request, onClose, onResolve }) {
  const dispatch = useDispatch();
  const [processing, setProcessing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [note, setNote] = useState("");

  if (!request) return null;

  const handleAction = async (status) => {
    setProcessing(true);
    try {
      await dispatch(resolveApprovalRequest({ id: request.id, status, note })).unwrap();
      toast.success(`Request ${status === "APPROVED" ? "Approved" : "Rejected"}`);
      if (onResolve) onResolve(request.id, status);
      onClose();
    } catch (err) {
      toast.error(err || "Failed to update status.");
    } finally {
      setProcessing(false);
    }
  };

  const d = new Date(request.createdAt);
  const { receiptSummary, items, globalDiscount } = request.data || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Top Header - Status & Close */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl ${request.status === "PENDING" ? "bg-amber-500 text-amber-950 border-amber-400" :
              request.status === "APPROVED" ? "bg-emerald-500 text-emerald-950 border-emerald-400" :
                "bg-rose-500 text-slate-100 border-rose-400"
            }`}>
            {request.status} REQUEST
          </span>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">✕</button>
        </div>

        {/* 🏢 Chain of Command Section */}
        <div className="px-8 pb-6 border-b border-white/5">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-6">{request.type} Authorization</h2>

          <div className="grid grid-cols-2 gap-6 bg-white/[0.03] p-6 rounded-3xl border border-white/5 shadow-inner">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Requested By</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm">
                  {request.requester.fullName?.slice(0, 2).toUpperCase() || "ST"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white leading-tight truncate">{request.requester.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-bold truncate lowercase">{request.requester.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">
                {request.status === "PENDING" ? "Resolver" : "Resolved By"}
              </p>
              <div className="flex items-center gap-3">
                {request.approver ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/20 flex items-center justify-center text-sky-400 font-black text-sm">
                      {request.approver.fullName?.slice(0, 2).toUpperCase() || "MG"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white leading-tight truncate">{request.approver.fullName}</p>
                      <p className="text-[10px] text-sky-500/60 font-bold truncate lowercase">{request.approver.email}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 text-xs animate-pulse">?</div>
                    <p className="text-xs font-bold text-slate-500 italic">Awaiting Manager...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-rose-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-black/40 border border-amber-500/30 px-6 py-5 rounded-3xl">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 leading-none">Submission Justification</p>
              <p className="text-lg font-bold text-slate-100 italic leading-snug">
                {request.reason?.startsWith("Custom: ") ? (
                  <><span className="text-amber-400 not-italic mr-2">Custom Reasoning:</span>"{request.reason.replace("Custom: ", "")}"</>
                ) : (`"${request.reason || "General Price Override"}"`)}
              </p>
            </div>
          </div>

          {!isRejecting && request.note && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-3xl animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Decision Narrative</p>
                <span className="text-[8px] font-black text-emerald-500/40 uppercase tracking-[0.2em]">Verified Record</span>
              </div>
              <p className="text-sm font-medium text-slate-200 italic">"{request.note}"</p>
            </div>
          )}

          <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Archive #POS-{request.id.slice(-6).toUpperCase()}</p>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{d.toLocaleDateString()} AT {d.toLocaleTimeString()}</span>
            </div>

            <div className="space-y-5">
              {items?.map((i, idx) => {
                const hasChange = i.customPrice !== null || i.discountValue > 0;
                return (
                  <div key={idx} className={`flex justify-between items-start transition-all ${hasChange ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <span className="text-sm font-black text-slate-100 leading-tight">{i.quantity > 1 && <span className="text-slate-500 mr-2">{i.quantity}x</span>}{i.productName}</span>
                      <div className="flex gap-3 items-center">
                        <span className="text-slate-500 text-[10px] font-bold">List: ${i.originalPrice?.toFixed(2)}</span>
                        {hasChange && i.customPrice !== null && (<span className="text-[10px] font-black text-amber-500/60 line-through tracking-tighter">${i.originalPrice?.toFixed(2)}</span>)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {hasChange ? (<>{i.customPrice !== null && (<span className="text-amber-400 font-black text-sm">${i.customPrice.toFixed(2)}</span>)}{i.discountValue > 0 && (<span className="text-rose-400 font-black text-xs">-{i.discountValue}{i.discountType === "PERCENT" ? "%" : "$"}</span>)}</>) : (<span className="text-slate-400 font-bold text-xs">${i.originalPrice?.toFixed(2)}</span>)}
                      <p className="text-[10px] font-bold text-slate-500 mt-1">${(i.lineTotal || (i.price * i.quantity)).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal</span><span>${receiptSummary?.subtotal?.toFixed(2) || "0.00"}</span></div>
              {globalDiscount?.value > 0 && (<div className="flex justify-between text-xs font-black text-sky-400"><span>Global Discount ({globalDiscount.value}{globalDiscount.type === "PERCENT" ? "%" : "$"})</span><span>-{receiptSummary?.discountAmount?.toFixed(2) || "0.00"}</span></div>)}
              <div className="flex justify-between items-center pt-4 border-t border-white/10"><span className="text-base font-black text-white uppercase tracking-widest">Requested Total</span><span className="text-2xl font-black text-white">${receiptSummary?.total?.toFixed(2) || "0.00"}</span></div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-black/20 border-t border-white/5">
          {request.status === "PENDING" ? (
            <div className="space-y-4">
              {isRejecting ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">Reason for Rejection</p>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Explain why this override is being denied..."
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none resize-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => handleAction("REJECTED")} disabled={processing || !note.trim()} className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 text-white text-sm font-black rounded-2xl shadow-xl shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest">Confirm Rejection</button>
                    <button onClick={() => { setIsRejecting(false); setNote(""); }} className="px-8 py-4 bg-white/5 text-slate-400 text-sm font-black rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => handleAction("APPROVED")} disabled={processing} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest font-black">{processing ? "Verifying..." : "Approve Scenario"}</button>
                  <button onClick={() => setIsRejecting(true)} disabled={processing} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white text-sm font-black rounded-2xl border border-white/10 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest">Reject Request</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 text-sm font-black rounded-2xl border border-white/10 transition-all uppercase tracking-widest">Close Record</button>
          )}
        </div>
      </div>
    </div>
  );
}
