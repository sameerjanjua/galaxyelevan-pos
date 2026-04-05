import { createAsyncThunk } from "@reduxjs/toolkit";

/**
 * Fetch all pending approval requests for a specific location
 */
export const fetchPendingRequests = createAsyncThunk(
  "approvals/fetchPending",
  async (locationId, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ status: "PENDING" });
      if (locationId) params.set("locationId", locationId);

      const response = await fetch(`/api/tenant/pos/approval-request?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch pending requests");
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch resolved approval requests (History) with date filters
 */
export const fetchHistoryRequests = createAsyncThunk(
  "approvals/fetchHistory",
  async ({ status, startDate, endDate, locationId }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ status, startDate, endDate });
      if (locationId) params.set("locationId", locationId);

      const response = await fetch(`/api/tenant/pos/approval-request?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch history");
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update the status of an approval request (Approve/Reject)
 */
export const resolveApprovalRequest = createAsyncThunk(
  "approvals/resolveRequest",
  async ({ id, status, note }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/tenant/pos/approval-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to resolve request");
      return { id, status, updatedRequest: data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Create a new approval request
 */
export const createApprovalRequest = createAsyncThunk(
  "approvals/createRequest",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tenant/pos/approval-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create request");
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch the status of a single approval request (Manual fallback)
 */
export const fetchSingleRequestStatus = createAsyncThunk(
  "approvals/fetchSingleStatus",
  async (id, { rejectWithValue }) => {
    try {
      // We use the broad fetch with an ID filter (or if backend supports /:id GET)
      const response = await fetch(`/api/tenant/pos/approval-request?id=${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch status");
      // The API returns an array, take the first one or null
      return data.find(r => r.id === id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
