"use client";

import { useEffect } from "react";

export function DeleteModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-5">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-900/30 rounded-full">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center text-slate-100 mb-2">
            {title || "Confirm Deletion"}
          </h2>
          <p className="text-sm text-center text-slate-400">
            {message || "Are you sure you want to delete this item? This action cannot be undone."}
          </p>
        </div>

        <div className="flex w-full border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="w-px bg-slate-800" />
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin -ml-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
