"use client";

import { useState } from "react";
import { ApprovalsInbox } from "./ApprovalsInbox";
import { ApprovalsHistoryTable } from "./ApprovalsHistoryTable";
import { ApprovalDetailModal } from "./ApprovalDetailModal";
import { useActiveLocation } from "@/hooks/useActiveLocation";

export function ApprovalsClient({ user }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { activeLocationId } = useActiveLocation();

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "pending"
              ? "bg-rose-500 text-white shadow-xl shadow-rose-500/20 active:scale-95"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Pending Requests
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "history"
              ? "bg-slate-800 text-white shadow-xl active:scale-95"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Audit History
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === "pending" ? (
          <div className="max-w-4xl">
            <ApprovalsInbox 
              user={user} 
              locationId={activeLocationId} 
              onViewRequest={setSelectedRequest}
            />
          </div>
        ) : (
          <ApprovalsHistoryTable 
            user={user} 
            locationId={activeLocationId} 
            onViewRequest={setSelectedRequest}
          />
        )}
      </div>

      {selectedRequest && (
        <ApprovalDetailModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onResolve={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
