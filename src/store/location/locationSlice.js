import { createSlice } from "@reduxjs/toolkit";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "./locationThunks";

const initialState = {
  locations: [],
  selectedLocationId: null,
  initialized: false,
  loading: false,
  error: null,
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setLocations: (state, action) => {
      state.locations = action.payload;
    },
    setSelectedLocation: (state, action) => {
      state.selectedLocationId = action.payload;
      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "selectedLocationId",
          action.payload || ""
        );
      }
    },
    /**
     * Initialize location context based on user role:
     * - Owner / global Manager: restore from localStorage or null (all locations)
     * - Assigned Manager / Staff: lock to user.locationId
     *
     * Expects payload: { user, locations }
     */
    initializeLocationForUser: (state, action) => {
      const { user, locations } = action.payload;
      if (!user || state.initialized) return;

      const isOwner = user.role === "OWNER";
      const isGlobalManager = user.role === "MANAGER" && !user.locationId;

      if (isOwner || isGlobalManager) {
        // Try restoring from localStorage
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("selectedLocationId");
          if (stored && locations.some((l) => l.id === stored)) {
            state.selectedLocationId = stored;
          } else {
            state.selectedLocationId = null; // All locations
          }
        }
      } else {
        // Assigned manager or staff — fixed
        state.selectedLocationId = user.locationId || null;
      }

      state.initialized = true;
    },
    addLocation: (state, action) => {
      state.locations.push(action.payload);
    },
    updateLocationLocal: (state, action) => {
      const index = state.locations.findIndex(
        (loc) => loc.id === action.payload.id
      );
      if (index > -1) {
        state.locations[index] = action.payload;
      }
    },
    removeLocation: (state, action) => {
      state.locations = state.locations.filter(
        (loc) => loc.id !== action.payload
      );
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    loadStoredLocation: (state) => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("selectedLocationId");
        if (stored) {
          state.selectedLocationId = stored;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.locations.push(action.payload);
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        const index = state.locations.findIndex(
          (loc) => loc.id === action.payload.id
        );
        if (index > -1) {
          state.locations[index] = action.payload;
        }
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.locations = state.locations.filter(
          (loc) => loc.id !== action.payload
        );
      });
  },
});

export const {
  setLocations,
  setSelectedLocation,
  initializeLocationForUser,
  addLocation,
  updateLocationLocal,
  removeLocation,
  setLoading,
  setError,
  loadStoredLocation,
} = locationSlice.actions;

export default locationSlice.reducer;
