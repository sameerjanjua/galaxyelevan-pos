import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPendingRequests,
  fetchHistoryRequests,
  resolveApprovalRequest,
  createApprovalRequest,
  fetchSingleRequestStatus,
} from "./approvalsThunks";

const initialState = {
  pending: [],
  history: [],
  lastResolved: null, // Captures { id, status, note, type, data }
  status: "idle",
  error: null,
};

const approvalsSlice = createSlice({
  name: "approvals",
  initialState,
  reducers: {
    addPendingRequest: (state, action) => {
      const exists = state.pending.find((r) => r.id === action.payload.id);
      if (!exists) {
        state.pending.unshift(action.payload);
      }
    },
    removePendingRequest: (state, action) => {
      // If we remove it via socket, we might not have the full status here
      // But usually, the socket event HAS the full request.
      // So we'll let the socket listener dispatch a custom action if needed.
      state.pending = state.pending.filter((r) => r.id !== action.payload);
    },
    setLastResolved: (state, action) => {
      state.lastResolved = action.payload;
    },
    clearLastResolved: (state) => {
      state.lastResolved = null;
    },
    clearHistory: (state) => {
      state.history = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingRequests.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.pending = action.payload;
      })
      .addCase(fetchHistoryRequests.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchHistoryRequests.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.history = action.payload;
      })
      .addCase(createApprovalRequest.fulfilled, (state, action) => {
        state.pending.unshift(action.payload);
      })
      .addCase(resolveApprovalRequest.fulfilled, (state, action) => {
        const { id, status, updatedRequest } = action.payload;
        state.pending = state.pending.filter((r) => r.id !== id);
        state.lastResolved = updatedRequest;
      })
      .addCase(fetchSingleRequestStatus.fulfilled, (state, action) => {
        const request = action.payload;
        if (!request) return;
        
        if (request.status !== "PENDING") {
          state.pending = state.pending.filter((r) => r.id !== request.id);
          state.lastResolved = request; // Trigger automation if resolved
        } else {
          const exists = state.pending.find(r => r.id === request.id);
          if (!exists) state.pending.unshift(request);
        }
      });
  },
});

export const { 
  addPendingRequest, 
  removePendingRequest, 
  setLastResolved, 
  clearLastResolved, 
  clearHistory 
} = approvalsSlice.actions;
export default approvalsSlice.reducer;
