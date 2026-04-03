"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function ProfileClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/tenant/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        fullName: data.fullName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        role: data.role || "",
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }

      setSuccess("Profile updated successfully");
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      
      // Optional: Refresh page to update any visual elements like sidebar
      // router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Profile Settings</h1>
        <p className="mt-2 text-slate-400">Manage your account information and password.</p>
      </div>

      <div className="space-y-8">
        {/* Personal Information */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-semibold text-slate-50">Personal Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-400 text-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address <span className="text-xs text-slate-500">(Read-only)</span></label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-2 bg-slate-800/30 border border-slate-700/50 rounded-xl text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Phone Number *</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition"
                  placeholder="+1234567890"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Role</label>
                <div className="px-4 py-2 bg-slate-800/30 border border-slate-700/50 rounded-xl text-slate-400 capitalize">
                  {formData.role.toLowerCase()}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-8 mt-8">
              <h3 className="text-lg font-semibold text-slate-50 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">🔒</span>
                Change Password
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium text-slate-300">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition"
                    placeholder="Enter current password to make changes"
                  />
                  <p className="text-xs text-slate-500">Required if you want to update your password.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition"
                      placeholder="Minimum 8 characters"
                      minLength="8"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="group relative inline-flex items-center gap-2 px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
