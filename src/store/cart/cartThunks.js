import { createAsyncThunk } from "@reduxjs/toolkit";

export const createSale = createAsyncThunk(
  "cart/createSale",
  async ({ customerId, discountPercent, locationId }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const items = state.cart.items;

      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          discountPercent,
          locationId,
          items,
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

