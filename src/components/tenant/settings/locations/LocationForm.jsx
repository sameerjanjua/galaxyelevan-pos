"use client";

import { useState } from "react";

export function LocationForm({ location, onSuccess }) {
  const [formData, setFormData] = useState({
    name: location?.name || "",
    code: location?.code || "",
    address: location?.address || "",
    city: location?.city || "",
    country: location?.country || "",
    phone: location?.phone || "",
    timezone: location?.timezone || "UTC",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isEdit = !!location?.id;
  const timezones = [
    "UTC",
    "EST",
    "CST",
    "MST",
    "PST",
    "GMT",
    "CET",
    "IST",
    "JST",
    "AEST",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!formData.name || !formData.code) {
      setError("Name and code are required");
      setSaving(false);
      return;
    }

    try {
      const method = isEdit ? "PATCH" : "POST";
      const url = isEdit
        ? `/api/tenant/locations/${location.id}`
        : "/api/tenant/locations";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `Failed to ${isEdit ? "update" : "create"} location`);
        setSaving(false);
        return;
      }

      setSuccess(
        `Location ${isEdit ? "updated" : "created"} successfully`
      );
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError("Network error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Location Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Main Store"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Location Code *
          </label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g., NYC"
            maxLength="10"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase"
            disabled={saving || (isEdit && !!location?.code)}
            title={isEdit && !!location?.code ? "Code cannot be changed" : ""}
          />
          {isEdit && !!location?.code && (
            <p className="text-xs text-slate-500 mt-1">Code cannot be changed</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Address
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="e.g., 123 Main Street"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            City
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="e.g., New York"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Country
          </label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="e.g., USA"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={saving}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g., +1-555-0123"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Timezone
          </label>
          <select
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={saving}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-800 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-950/50 border border-green-800 p-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60 transition"
      >
        {saving ? "Saving..." : isEdit ? "Update Location" : "Create Location"}
      </button>
    </form>
  );
}
