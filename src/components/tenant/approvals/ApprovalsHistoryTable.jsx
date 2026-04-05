"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { fetchHistoryRequests } from "@/store/approvals/approvalsThunks";

export function ApprovalsHistoryTable({ user, locationId, onViewRequest }) {
  const dispatch = useDispatch();
  const { history: data, status } = useSelector((state) => state.approvals);
  const loading = status === "loading";

  const [dateFilter, setDateFilter] = useState("TODAY"); // TODAY, 7 Days, 30 Days, CUSTOM
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, APPROVED, REJECTED
  
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const getDateRange = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateFilter === "7 Days") {
      start.setDate(start.getDate() - 7);
    } else if (dateFilter === "30 Days") {
      start.setDate(start.getDate() - 30);
    } else if (dateFilter === "CUSTOM") {
      start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);
      const customEnd = new Date(customRange.end);
      customEnd.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: customEnd.toISOString() };
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  useEffect(() => {
    const { start, end } = getDateRange();
    dispatch(fetchHistoryRequests({ 
      status: statusFilter, 
      startDate: start, 
      endDate: end, 
      locationId 
    }));
  }, [dispatch, dateFilter, statusFilter, customRange, locationId]);

  const handleExport = () => {
    if (data.length === 0) return toast.info("No data to export");
    const headers = ["Date", "Type", "Status", "Requester", "Reason", "Original Price", "Override Price", "Discount", "Product", "Manager Note"];
    const rows = [];
    data.forEach((req) => {
      const items = req.data.items || [];
      const dateStr = new Date(req.createdAt).toLocaleString();
      const baseInfo = [
        `"${dateStr}"`, `"${req.type}"`, `"${req.status}"`, `"${req.requester.fullName}"`, 
        `"${req.reason || ""}"`
      ];
      const managerNote = `"${req.note || ""}"`;
      if (items.length > 0) {
        items.forEach(item => {
           rows.push([
            ...baseInfo,
            item.originalPrice?.toFixed(2) || "0.00",
            item.customPrice?.toFixed(2) || "N/A",
            `"${item.discountValue ? `${item.discountValue}${item.discountType === "PERCENT" ? "%" : "$"}` : "0"}"`,
            `"${item.productName}"`,
            managerNote
          ]);
        });
      } else {
        rows.push([...baseInfo, "N/A", "N/A", "N/A", "General Request", managerNote]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Approvals_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit Log Exported!");
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Filters Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-950/40 p-5 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl">
         <div className="flex flex-wrap gap-4">
            {/* Date Quick Filters */}
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
               {["TODAY", "7 Days", "30 Days", "CUSTOM"].map(f => (
                 <button
                   key={f}
                   onClick={() => setDateFilter(f)}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                     dateFilter === f ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-500 hover:text-white hover:bg-white/5"
                   }`}
                 >
                   {f}
                 </button>
               ))}
            </div>

            {/* Outcome Filters */}
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
               {[
                 { label: "ALL", value: "ALL" },
                 { label: "APPROVED", value: "APPROVED" },
                 { label: "REJECTED", value: "REJECTED" }
               ].map(f => (
                 <button
                   key={f.value}
                   onClick={() => setStatusFilter(f.value)}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                     statusFilter === f.value 
                      ? (f.value === "REJECTED" ? "bg-rose-500 text-white shadow-rose-500/20" : f.value === "APPROVED" ? "bg-emerald-500 text-slate-900 shadow-emerald-500/20" : "bg-slate-700 text-white shadow-xl")
                      : "text-slate-500 hover:text-white"
                   }`}
                 >
                   {f.label}
                 </button>
               ))}
            </div>
         </div>

         <div className="flex items-center gap-3 w-full xl:w-auto">
            {dateFilter === "CUSTOM" && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
                  <input type="date" value={customRange.start} onChange={(e) => setCustomRange(prev => ({...prev, start: e.target.value}))} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none" />
                  <span className="text-slate-500">to</span>
                  <input type="date" value={customRange.end} onChange={(e) => setCustomRange(prev => ({...prev, end: e.target.value}))} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none" />
                </div>
            )}
            <button
               onClick={handleExport}
               className="flex-1 xl:flex-none px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black rounded-2xl border border-white/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              📊 Export CSV
            </button>
         </div>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/40">
         <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5 border-b border-white/5 uppercase tracking-widest text-slate-500 text-[10px] font-black">
                    <th className="px-8 py-5">Record Timeline</th>
                    <th className="px-8 py-5">Type</th>
                    <th className="px-8 py-5">Resolution</th>
                    <th className="px-8 py-5">Invoice #</th>
                    <th className="px-8 py-5 text-right">Contextual Data</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {loading && data.length === 0 ? (
                    <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-500 animate-pulse text-[10px] uppercase tracking-widest font-black">Hydrating audit log...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-500 text-[10px] uppercase tracking-widest font-black">No activity found for these filters.</td></tr>
                  ) : (
                    data.map((req) => {
                      const d = new Date(req.createdAt);
                      return (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                             <p className="text-xs font-black text-slate-200 leading-none">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                             <p className="text-[10px] text-slate-500 mt-1 font-bold">{d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-[9px] font-black px-2 py-1 rounded bg-slate-800 text-slate-400 border border-white/5 uppercase tracking-widest">{req.type}</span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                                  req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                }`}>{req.status}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             {req.sale?.invoiceNumber ? (
                               <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20 tabular-nums">
                                 {req.sale.invoiceNumber}
                               </span>
                             ) : (
                               <span className="text-[9px] font-bold text-slate-600 italic">No Sale Linked</span>
                             )}
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end gap-5">
                                <div className="flex flex-col items-end">
                                   <div className="flex items-center gap-2 mb-1">
                                      <p className="text-xs font-black text-slate-300">{req.requester.fullName}</p>
                                      <span className="text-slate-600 text-[10px]">requested</span>
                                   </div>
                                   {req.note ? (
                                      <p className="text-[10px] font-bold text-sky-400/80 bg-sky-500/5 px-2 py-0.5 rounded italic">Manager Context: "{req.note}"</p>
                                   ) : (
                                      <p className="text-[10px] font-medium text-slate-600 truncate max-w-[200px]">Justification: "{req.reason || "General Override"}"</p>
                                   )}
                                </div>
                                <button
                                  onClick={() => onViewRequest?.(req)}
                                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-95 shadow-xl"
                                  title="Expand Full Archive"
                                >👀</button>
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
    </div>
  );
}
