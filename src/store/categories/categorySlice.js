import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categoryThunks";

const initialState = {
  items: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Create Category
      .addCase(createCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
        // We could sort or let the store be unsorted, but ideally it's sorted by name.
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      // Update Category
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
          state.items.sort((a, b) => a.name.localeCompare(b.name));
        }
      })
      // Delete Category
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      });
  },
});

export default categorySlice.reducer;
