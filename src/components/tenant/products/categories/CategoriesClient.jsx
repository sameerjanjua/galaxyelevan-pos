"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/store/categories/categoryThunks";
import { DeleteModal } from "@/components/common/modals/DeleteModal";

export default function CategoriesClient() {
  const dispatch = useDispatch();
  const { items: categories, status } = useSelector((state) => state.categories);
  const loading = status === "loading" || status === "idle";

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    parentId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchCategories());
    }
  }, [status, dispatch]);

  const handleOpenModal = (category = null) => {
    setSelectedCategory(category);
    if (category) {
      setFormData({
        name: category.name,
        parentId: category.parentId || "",
      });
    } else {
      setFormData({
        name: "",
        parentId: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
    setFormData({ name: "", parentId: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (selectedCategory && formData.parentId === selectedCategory.id) {
      toast.error("Category cannot be its own parent");
      return;
    }

    try {
      setSubmitting(true);
      const isEdit = !!selectedCategory;

      if (isEdit) {
        await dispatch(
          updateCategory({
            id: selectedCategory.id,
            categoryData: {
              name: formData.name,
              parentId: formData.parentId || null,
            },
          })
        ).unwrap();
        toast.success("Category updated successfully");
      } else {
        await dispatch(
          createCategory({
            name: formData.name,
            parentId: formData.parentId || null,
          })
        ).unwrap();
        toast.success("Category created successfully");
      }

      handleCloseModal();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : (error?.message || "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const initiateDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      await dispatch(deleteCategory(categoryToDelete.id)).unwrap();
      toast.success("Category deleted successfully");
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } catch (error) {
      toast.error(typeof error === 'string' ? error : (error?.message || "An error occurred"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto text-slate-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage product categories and hierarchy
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          + New Category
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No categories found. Create one to get started.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Slug</th>
                <th className="p-4 font-medium">Parent Category</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categories.map((category) => {
                const parent = categories.find((c) => c.id === category.parentId);
                return (
                  <tr key={category.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4 font-medium text-slate-200">
                      {category.name}
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-xs">
                      {category.slug}
                    </td>
                    <td className="p-4 text-slate-400">
                      {parent ? parent.name : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="text-sky-400 hover:text-sky-300 font-medium mr-4 text-xs tracking-wide"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => initiateDelete(category)}
                        className="text-red-400 hover:text-red-300 font-medium text-xs tracking-wide"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100">
                {selectedCategory ? "Edit Category" : "New Category"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Beverages"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parent Category
                </label>
                <select
                  name="parentId"
                  value={formData.parentId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">— None (Top Level) —</option>
                  {categories
                    .filter((c) => !selectedCategory || c.id !== selectedCategory.id) // Cannot be parent of itself
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        isLoading={isDeleting}
        title="Delete Category"
        message={
          categoryToDelete
            ? `Are you sure you want to delete the category "${categoryToDelete.name}"? This action cannot be undone.`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setCategoryToDelete(null);
        }}
      />
    </div>
  );
}
