'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id;

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    industry: "",
  });

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const res = await fetch(`/api/admin/businesses/${businessId}`);
        if (!res.ok) throw new Error("Failed to fetch business");
        const data = await res.json();
        setBusiness(data);
        setFormData({
          name: data.name,
          industry: data.industry || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update business");

      const data = await res.json();
      setBusiness((prev) => ({ ...prev, ...data.business }));
      setEditMode(false);
      alert("Business updated successfully!");
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspensionClick = () => {
    setConfirmAction(business.isSuspended ? "unsuspend" : "suspend");
    setShowConfirmDialog(true);
  };

  const handleConfirmToggleSuspension = async () => {
    setSuspendLoading(true);
    try {
      const endpoint = confirmAction === "suspend"
        ? `/api/admin/businesses/${businessId}/suspend`
        : `/api/admin/businesses/${businessId}/unsuspend`;

      const res = await fetch(endpoint, {
        method: "POST",
      });

      if (!res.ok) throw new Error(`Failed to ${confirmAction} business`);

      const data = await res.json();
      setBusiness((prev) => ({ ...prev, isSuspended: data.business.isSuspended }));
      setShowConfirmDialog(false);
      setConfirmAction(null);
      alert(`Business ${confirmAction}ed successfully!`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSuspendLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-300">Loading business details...</div>;
  }

  if (error || !business) {
    return <div className="text-red-400">Error: {error || "Business not found"}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/admin/businesses" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Businesses
          </Link>
          <h1 className="text-3xl font-bold text-white">{business.name}</h1>
          <p className="text-gray-400 mt-1">Business ID: {business.id}</p>
        </div>
        <div className="flex space-x-3 items-center">
          {business.isSuspended && (
            <div className="px-4 py-2 bg-red-900 text-red-200 rounded font-medium text-sm flex items-center gap-2">
              <span className="text-lg">🔒</span> Suspended
            </div>
          )}
          <button
            onClick={handleToggleSuspensionClick}
            disabled={suspendLoading}
            className={`px-4 py-2 text-white rounded font-medium transition disabled:cursor-not-allowed ${
              business.isSuspended
                ? "bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                : "bg-red-600 hover:bg-red-700 disabled:bg-gray-600"
            }`}
          >
            {suspendLoading
              ? business.isSuspended
                ? "Unsuspending..."
                : "Suspending..."
              : business.isSuspended
              ? "✓ Unsuspend Business"
              : "⚠️ Suspend Business"}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {business.isSuspended && (
        <div className="bg-red-900/20 border border-red-700 text-red-200 p-4 rounded-lg">
          <div className="flex gap-3">
            <div className="text-2xl">🔒</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Account Suspended</h3>
              <p className="mt-2 text-sm text-red-100">
                This business account is currently suspended. All users are unable to login or access any features.
                Click the "Unsuspend Business" button above to restore access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Business Info & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Business Information</h2>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Edit
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={handleSaveChanges}
                    disabled={actionLoading}
                    className="text-green-400 hover:text-green-300 font-medium disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="text-gray-400 hover:text-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Business Name</label>
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-white text-lg">{business.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Slug</label>
                <p className="text-gray-300">{business.slug}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Industry</label>
                {editMode ? (
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Not specified</option>
                    <option value="cafe">Cafe</option>
                    <option value="retail">Retail</option>
                    <option value="mobile_shop">Mobile Shop</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="clothing">Clothing</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-300">{business.industry || "Not specified"}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Created</label>
                  <p className="text-gray-300">{new Date(business.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Last Updated</label>
                  <p className="text-gray-300">{new Date(business.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-gray-400 text-sm">Total Revenue</div>
              <div className="text-2xl font-bold text-white mt-2">
                ${Number(business.stats?.totalRevenue || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-gray-400 text-sm">Total Sales</div>
              <div className="text-2xl font-bold text-white mt-2">
                {business.stats?.salesCount || 0}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-gray-400 text-sm">Active Customers</div>
              <div className="text-2xl font-bold text-white mt-2">
                {business.stats?.customerCount || 0}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-gray-400 text-sm">Products</div>
              <div className="text-2xl font-bold text-white mt-2">
                {business.stats?.productCount || 0}
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Locations</h3>
            {business.locations && business.locations.length > 0 ? (
              <div className="space-y-3">
                {business.locations.map((location) => (
                  <div key={location.id} className="bg-gray-700 p-4 rounded">
                    <div className="font-medium text-white">{location.name}</div>
                    <div className="text-sm text-gray-400 mt-1">Timezone: {location.timezone}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: {location.id}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No locations found</p>
            )}
          </div>
        </div>

        {/* Right Column - Users/Staff */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Users & Staff</h3>
          {business.users && business.users.length > 0 ? (
            <div className="space-y-3">
              {business.users.map((user) => (
                <div key={user.id} className="bg-gray-700 p-4 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{user.fullName}</div>
                      <div className="text-sm text-gray-400 mt-1">{user.email}</div>
                      <div className="mt-2 flex gap-2">
                        <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs font-medium">
                          {user.role}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isActive
                            ? "bg-green-900 text-green-200"
                            : "bg-red-900 text-red-200"
                        }`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No users found</p>
          )}
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full mx-4">
            {/* Header */}
            <div className={`p-6 border-b border-gray-700 ${
              confirmAction === "suspend" ? "bg-red-900/20" : "bg-green-900/20"
            }`}>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {confirmAction === "suspend" ? "⚠️ Suspend Business" : "✓ Unsuspend Business"}
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-300">
                {confirmAction === "suspend"
                  ? `Are you sure you want to suspend "${business.name}"? All users will be immediately unable to login or access any features.`
                  : `Are you sure you want to unsuspend "${business.name}"? All users will be able to login and access features again.`}
              </p>

              {confirmAction === "suspend" && (
                <div className="bg-red-900/20 border border-red-700 rounded p-3 text-red-200 text-sm">
                  <p className="font-medium">⚠️ Impact:</p>
                  <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                    <li>All {business.stats?.userCount || 0} users cannot login</li>
                    <li>No transactions can be created</li>
                    <li>Business data remains intact</li>
                    <li>Can be unsuspended at any time</li>
                  </ul>
                </div>
              )}

              {confirmAction === "unsuspend" && (
                <div className="bg-green-900/20 border border-green-700 rounded p-3 text-green-200 text-sm">
                  <p className="font-medium">✓ Result:</p>
                  <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                    <li>All users regain login access</li>
                    <li>Full operations restored</li>
                    <li>All data available</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleSuspension}
                disabled={suspendLoading}
                className={`flex-1 px-4 py-2 text-white rounded font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${
                  confirmAction === "suspend"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {suspendLoading
                  ? confirmAction === "suspend"
                    ? "Suspending..."
                    : "Unsuspending..."
                  : confirmAction === "suspend"
                  ? "Yes, Suspend"
                  : "Yes, Unsuspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
