import { createAsyncThunk } from "@reduxjs/toolkit";

export const fetchLocations = createAsyncThunk(
  "location/fetchLocations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tenant/locations");
      if (!response.ok) {
        return rejectWithValue("Failed to fetch locations");
      }
      const data = await response.json();
      return data.locations || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createLocation = createAsyncThunk(
  "location/createLocation",
  async (locationData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tenant/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error || "Failed to create location");
      }

      const data = await response.json();
      return data.location;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateLocation = createAsyncThunk(
  "location/updateLocation",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/tenant/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await response.json();
        return rejectWithValue(
          responseData.error || "Failed to update location"
        );
      }

      const responseData = await response.json();
      return responseData.location;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteLocation = createAsyncThunk(
  "location/deleteLocation",
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/tenant/locations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error || "Failed to delete location");
      }

      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
