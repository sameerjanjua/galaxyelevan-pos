import { createSlice } from "@reduxjs/toolkit";
import { createSale } from "./cartThunks";

const initialState = {
  items: [],
  customerId: "",
  globalDiscountValue: 0,
  globalDiscountType: "PERCENT",
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
        state.items.push({ 
          productId, 
          quantity: 1,
          discountType: "PERCENT",
          discountValue: 0,
          customPrice: null
        });
      }
    },
    setItemDiscount: (state, action) => {
      const { productId, discountType, discountValue } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (item) {
        if (discountType !== undefined) item.discountType = discountType;
        if (discountValue !== undefined) item.discountValue = discountValue;
      }
    },
    setItemPrice: (state, action) => {
      const { productId, customPrice } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (item) {
        item.customPrice = customPrice;
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
    setCustomer: (state, action) => {
      state.customerId = action.payload;
    },
    setGlobalDiscount: (state, action) => {
      const { type, value } = action.payload;
      if (type !== undefined) state.globalDiscountType = type;
      if (value !== undefined) state.globalDiscountValue = value;
    },
    hydrateCart: (state, action) => {
      const { items, customerId, globalDiscountValue, globalDiscountType } = action.payload;
      state.items = items || [];
      state.customerId = customerId || "";
      state.globalDiscountValue = globalDiscountValue || 0;
      state.globalDiscountType = globalDiscountType || "PERCENT";
    },
    clearCart: (state) => {
      state.items = [];
      state.customerId = "";
      state.globalDiscountValue = 0;
      state.globalDiscountType = "PERCENT";
    },
    updateStockLevels: (state, action) => {
      state.stockLevels = action.payload;
    },
    updateSingleProductStock: (state, action) => {
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
        state.customerId = "";
        state.globalDiscountValue = 0;
        state.globalDiscountType = "PERCENT";
        state.lastSale = action.payload.sale;
      })
      .addCase(createSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to complete sale.";
      });
  },
});

export const { 
  addItem, 
  setItemDiscount, 
  setItemPrice, 
  changeQty, 
  clearCart, 
  setCustomer, 
  setGlobalDiscount, 
  hydrateCart,
  updateStockLevels, 
  updateSingleProductStock 
} = cartSlice.actions;

export default cartSlice.reducer;
