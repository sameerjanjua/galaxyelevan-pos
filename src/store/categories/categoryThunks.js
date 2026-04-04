import { createAsyncThunk } from "@reduxjs/toolkit";

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tenant/categories");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch categories");
      return data.categories;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  "categories/createCategory",
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tenant/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create category");
      return data.category;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async ({ id, categoryData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/tenant/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update category");
      return data.category;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/tenant/categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }
      return id; // Return the deleted ID to filter it out
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
