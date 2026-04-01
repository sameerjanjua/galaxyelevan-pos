import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/auth/authSlice";
import cartReducer from "@/store/cart/cartSlice";
import locationReducer from "@/store/location/locationSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      location: locationReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export const store = makeStore();

export default store;

