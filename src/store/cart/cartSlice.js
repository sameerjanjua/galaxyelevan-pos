import { createSlice } from "@reduxjs/toolkit";
import { createSale } from "./cartThunks";

const initialState = {
  items: [],
  loading: false,
  error: null,
  lastSale: null,
  stockLevels: {}, // Product ID -> stock info map
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const productId = action.payload;
      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ productId, quantity: 1 });
      }
    },
    changeQty: (state, action) => {
      const { productId, delta } = action.payload;
      state.items = state.items
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0);
    },
    clearCart: (state) => {
      state.items = [];
    },
    updateStockLevels: (state, action) => {
      // Update stock levels from real-time sync
      state.stockLevels = action.payload;
    },
    updateSingleProductStock: (state, action) => {
      // Update a single product's stock incrementally (from Socket.io)
      const { productId, quantity } = action.payload;
      if (state.stockLevels[productId]) {
        state.stockLevels[productId] = {
          ...state.stockLevels[productId],
          totalStock: (state.stockLevels[productId].totalStock || 0) + quantity,
          quantity: (state.stockLevels[productId].quantity || 0) + quantity,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.items = [];
        state.lastSale = action.payload.sale;
      })
      .addCase(createSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to complete sale.";
      });
  },
});

export const { addItem, changeQty, clearCart, updateStockLevels, updateSingleProductStock } = cartSlice.actions;

export default cartSlice.reducer;

