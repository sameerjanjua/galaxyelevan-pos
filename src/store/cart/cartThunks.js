import { createAsyncThunk } from "@reduxjs/toolkit";

export const createSale = createAsyncThunk(
  "cart/createSale",
  async ({ customerId, globalDiscountValue, globalDiscountType, locationId, approvalRequestId }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const items = state.cart.items;

      const res = await fetch("/api/tenant/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          globalDiscountValue,
          globalDiscountType,
          locationId,
          items,
          approvalRequestId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        return thunkAPI.rejectWithValue(
          data?.error || "Failed to complete sale.",
        );
      }

      return data;
    } catch {
      return thunkAPI.rejectWithValue("Network error completing sale.");
    }
  },
);

