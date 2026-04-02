"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocations } from "@/store/location/locationThunks";
import { setError as setLocationError } from "@/store/location/locationSlice";
import { useRouter } from "next/navigation";
import { LocationForm } from "./LocationForm";

export default function LocationsAdminPage() {
  const dispatch = useDispatch();
  const locations = useSelector((state) => state.location.locations);
  const loading = useSelector((state) => state.location.loading);
  const error = useSelector((state) => state.location.error);

  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const hasFetchedInitiallyRef = useRef(false);

  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const isOwner = user?.role === "OWNER";

  useEffect(() => {
    if (user && !isOwner) {
      router.push("/dashboard");
    }
  }, [user, isOwner, router]);

  useEffect(() => {
    if (!isOwner || hasFetchedInitiallyRef.current) {
      return;
    }

    hasFetchedInitiallyRef.current = true;

    if (locations.length === 0) {
      dispatch(fetchLocations());
    }
  }, [dispatch, isOwner, locations.length]);

  if (!isOwner) return null; // Early return for non-owners while redirecting

  const handleDeleteLocation = async (id) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/tenant/locations/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Refresh locations
        dispatch(fetchLocations());
        setDeleteId(null);
      } else {
        const data = await response.json();
        dispatch(setLocationError(data.error || "Failed to delete location"));
      }
    } catch (err) {
      dispatch(setLocationError("Network error"));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📍 Location Management</h1>
            <p className="text-slate-400">
              Create, edit, and manage your business locations
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-sky-500 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition"
          >
            {showCreateForm ? "Cancel" : "➕ New Location"}
          </button>
        </header>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800 p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-lg border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Location</h2>
            <LocationForm
              onSuccess={() => {
                setShowCreateForm(false);
                dispatch(fetchLocations());
              }}
            />
          </div>
        )}

        {/* Locations Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-12 text-center">
            <p className="text-slate-400 mb-4">No locations yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition"
            >
              Create Your First Location
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-slate-50">
                      {location.name}
                    </h2>
                    <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-slate-400">
                      {location.code}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {location.address && (
                    <p className="text-slate-400">
                      <span className="font-medium">Address:</span> {location.address}
                    </p>
                  )}
                  {(location.city || location.country) && (
                    <p className="text-slate-400">
                      <span className="font-medium">Location:</span>{" "}
                      {[location.city, location.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {location.phone && (
                    <p className="text-slate-400">
                      <span className="font-medium">Phone:</span> {location.phone}
                    </p>
                  )}
                  {location.timezone && (
                    <p className="text-slate-400">
                      <span className="font-medium">Timezone:</span>{" "}
                      {location.timezone}
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Created {new Date(location.createdAt).toLocaleDateString()}
                </p>

                <div className="flex gap-2 pt-4 border-t border-slate-800">
                  {editingId === location.id ? (
                    <>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(location.id)}
                        className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                      >
                        ✏️ Edit
                      </button>
                      {deleteId === location.id ? (
                        <>
                          <button
                            onClick={() => setDeleteId(null)}
                            disabled={deleteLoading}
                            className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60 transition"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() =>
                                handleDeleteLocation(location.id)
                            }
                            disabled={deleteLoading}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60 transition"
                          >
                            {deleteLoading ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      ) : (
                        location.id !== locations.reduce((prev, curr) => (new Date(prev.createdAt) < new Date(curr.createdAt) ? prev : curr), locations[0]).id && (
                          <button
                            onClick={() => setDeleteId(location.id)}
                            className="flex-1 rounded-lg border border-red-800/50 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/50 transition"
                          >
                            🗑️ Delete
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>

                {/* Edit Form */}
                {editingId === location.id && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <LocationForm
                      location={location}
                      onSuccess={() => {
                        setEditingId(null);
                        dispatch(fetchLocations());
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

