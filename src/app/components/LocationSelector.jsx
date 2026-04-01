"use client";

import { useState } from "react";

export function LocationSelector({ locations, selectedId, onSelect, userRole }) {
  const selectedLocation = locations.find((loc) => loc.id === selectedId);
  const isOwner = userRole === "OWNER";

  return (
    <div className="space-y-1 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
        📍 Current Location
      </label>
      
      {isOwner ? (
        <select
          value={selectedId || ""}
          onChange={(e) => onSelect && onSelect(e.target.value || null)}
          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:border-sky-500 font-medium transition-colors"
        >
          <option value="">All Locations (HQ)</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-200">
            {selectedLocation?.name || "Global / HQ"}
          </p>
          {selectedLocation && (selectedLocation.city || selectedLocation.country) && (
            <p className="text-xs text-slate-400">
              {[selectedLocation.city, selectedLocation.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

