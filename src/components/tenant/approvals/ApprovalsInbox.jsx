"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "@/hooks/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";
import { toast } from "sonner";
import { 
  fetchPendingRequests, 
  resolveApprovalRequest 
} from "@/store/approvals/approvalsThunks";
import { addPendingRequest } from "@/store/approvals/approvalsSlice";

export function ApprovalsInbox({ user, locationId, onViewRequest }) {
  const dispatch = useDispatch();
  const { pending: requests, status } = useSelector((state) => state.approvals);
  const loading = status === "loading";
  
  const [processingId, setProcessingId] = useState(null);

  // Real-time listener
  const { on, off } = useSocket(`dashboard-${user.tenantId}`);

  useEffect(() => {
    dispatch(fetchPendingRequests(locationId));
  }, [dispatch, locationId]);

  useEffect(() => {
    const handleNewRequest = (request) => {
      toast("🛎️ New Approval Request!", { icon: "💡" });
      dispatch(addPendingRequest(request));
    };

    if (on) {
      on(SOCKET_EVENTS.APPROVAL_REQUESTED, handleNewRequest);
    }
    return () => {
      if (off) off(SOCKET_EVENTS.APPROVAL_REQUESTED);
    };
  }, [on, off, dispatch]);

  const handleResolve = async (id, status) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      await dispatch(resolveApprovalRequest({ id, status })).unwrap();
      toast.success(`Request ${status === "APPROVED" ? "Approved" : "Rejected"}`);
    } catch (err) {
      toast.error(err || "Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mb-8 overflow-hidden rounded-[2rem] border border-rose-500/30 bg-rose-500/5 backdrop-blur-xl animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-rose-500/30 bg-rose-500/10 px-8 py-4">
        <h2 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
          </span>
          Active Authorization Queue ({requests.length})
        </h2>
        <button 
          onClick={() => dispatch(fetchPendingRequests(locationId))}
          className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 uppercase tracking-widest text-slate-500 text-[10px] font-black">
              <th className="px-8 py-4 font-black">Timestamp</th>
              <th className="px-8 py-4 font-black">Type</th>
              <th className="px-8 py-4 font-black">Requester</th>
              <th className="px-8 py-4 font-black">Details</th>
              <th className="px-8 py-4 font-black text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && requests.length === 0 ? (
              <tr><td colSpan="5" className="px-8 py-12 text-center text-rose-300/40 animate-pulse text-xs uppercase tracking-widest font-black">Synchronizing queue...</td></tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-8 py-20 text-center">
                   <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-700">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                         <span className="text-2xl">🛡️</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-white uppercase tracking-widest">Authorization Queue Clear</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">No pending override requests at this time</p>
                      </div>
                      <button 
                        onClick={() => dispatch(fetchPendingRequests(locationId))}
                        className="mt-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black text-rose-300 rounded-full border border-rose-500/20 transition-all uppercase tracking-widest"
                      >
                        Scan for Updates
                      </button>
                   </div>
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const d = new Date(req.createdAt);
                return (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-4">
                       <p className="text-xs font-bold text-slate-200 leading-none">{d.toLocaleDateString()}</p>
                       <p className="text-[10px] text-slate-500 mt-1">{d.toLocaleTimeString()}</p>
                    </td>
                    <td className="px-8 py-4">
                       <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/20 uppercase tracking-widest">
                         {req.type}
                       </span>
                    </td>
                    <td className="px-8 py-4">
                       <p className="text-xs font-black text-slate-300">{req.requester.fullName}</p>
                       <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{req.location.name}</p>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex flex-col gap-1">
                          {req.data.globalDiscount?.value > 0 ? (
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Global Discount</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500">{req.data.items?.length || 0} items modified</span>
                          )}
                          <p className="text-[10px] italic text-slate-600 truncate max-w-[200px]">"{req.reason || "No reason"}"</p>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewRequest?.(req)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/5 transition-all active:scale-95"
                            title="Detailed Review"
                          >
                             👀
                          </button>
                          <button
                            onClick={() => handleResolve(req.id, "APPROVED")}
                            disabled={processingId === req.id}
                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                            title="Quick Approve"
                          >
                             ✓
                          </button>
                          <button
                            onClick={() => handleResolve(req.id, "REJECTED")}
                            disabled={processingId === req.id}
                            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                            title="Quick Reject"
                          >
                             ✕
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
