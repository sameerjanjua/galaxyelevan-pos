import { createAsyncThunk } from "@reduxjs/toolkit";
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, thunkAPI) => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        return thunkAPI.rejectWithValue("No active session.");
      }
      const data = await res.json();
      return data;
    } catch {
      return thunkAPI.rejectWithValue("Network error.");
    }
  }
);
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, thunkAPI) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        return thunkAPI.rejectWithValue(data?.error || "Failed to login.");
      }

      return data;
    } catch {
      return thunkAPI.rejectWithValue("Network error while logging in.");
    }
  },
);


export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, thunkAPI) => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => null);

      console.log("inside logout user", data);
      

      if (!res.ok || !data?.success) {
        return thunkAPI.rejectWithValue(data?.error || "Failed to logout.");
      }

      return data;
    } catch {
      return thunkAPI.rejectWithValue("Network error while logging out.");
    }
  },
);

