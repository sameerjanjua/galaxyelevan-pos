"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp =
  "w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500";
const lbl = "block text-slate-300 text-xs font-semibold mb-1";

function Field({ label, children }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
      {children}
    </p>
  );
}

export default function ProductDetail() {
  const params = useParams();
  const productId = params.id;

  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      const [productRes, suppliersRes, categoriesRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch("/api/inventory/suppliers?limit=100"),
        fetch("/api/categories?limit=200"),
      ]);

      if (productRes.ok) {
        const data = await productRes.json();
        setProduct(data.product);
        setMovements(data.movements);
        // Flatten metadata into formData for easy field binding
        setFormData({
          ...data.product,
          brand: data.product.metadata?.brand ?? "",
          model: data.product.metadata?.model ?? "",
          imei: data.product.metadata?.imei ?? "",
          color: data.product.metadata?.color ?? "",
        });
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.suppliers ?? []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories ?? []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => {
    const val =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    // Build metadata from individual fields
    const metadata = {
      ...(formData.brand?.trim() ? { brand: formData.brand.trim() } : {}),
      ...(formData.model?.trim() ? { model: formData.model.trim() } : {}),
      ...(formData.imei?.trim() ? { imei: formData.imei.trim() } : {}),
      ...(formData.color?.trim() ? { color: formData.color.trim() } : {}),
    };

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          description: formData.description || null,
          type: formData.type,
          unit: formData.unit || "unit",
          categoryId: formData.categoryId || null,
          supplierId: formData.supplierId || null,
          costPrice: formData.costPrice,
          salePrice: formData.salePrice,
          lowStockAlert:
            formData.lowStockAlert !== "" ? formData.lowStockAlert : null,
          trackStock: formData.trackStock,
          batchTracking: formData.batchTracking,
          expiryTracking: formData.expiryTracking,
          isActive: formData.isActive,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const prod = data.product;
        setProduct(prod);
        setFormData({
          ...prod,
          brand: prod.metadata?.brand ?? "",
          model: prod.metadata?.model ?? "",
          imei: prod.metadata?.imei ?? "",
          color: prod.metadata?.color ?? "",
        });
        setEditMode(false);
        setMessage("✓ Product updated successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await res.json();
        setMessage(`✗ ${error.error}`);
      }
    } catch (error) {
      setMessage("Error saving product");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">Loading product…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-slate-400">Product not found</p>
        <Link
          href="/products/management"
          className="text-sky-400 hover:text-sky-300"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
  const totalValue = totalStock * Number(product.costPrice || 0);
  const margin =
    Number(product.salePrice) > 0
      ? (
          ((Number(product.salePrice) - Number(product.costPrice || 0)) /
            Number(product.salePrice)) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span>{product.type}</span>
              {product.sku && (
                <>
                  <span>·</span>
                  <span>SKU: {product.sku}</span>
                </>
              )}
              {product.category && (
                <>
                  <span>·</span>
                  <span>{product.category.name}</span>
                </>
              )}
              <span>·</span>
              <span
                className={
                  product.isActive ? "text-emerald-400" : "text-slate-500"
                }
              >
                {product.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setFormData({
                      ...product,
                      brand: product.metadata?.brand ?? "",
                      model: product.metadata?.model ?? "",
                      imei: product.metadata?.imei ?? "",
                      color: product.metadata?.color ?? "",
                    });
                  }}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
                >
                  Cancel
                </button>
              </>
            )}
            <Link
              href="/products/management"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
            >
              Back
            </Link>
          </div>
        </div>

        {/* ── Message banner ── */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-3 text-sm ${
              message.startsWith("✓")
                ? "border border-emerald-700 bg-emerald-900/30 text-emerald-300"
                : "border border-red-700 bg-red-900/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: main form / view ── */}
          <div className="space-y-6 lg:col-span-2">
            {editMode ? (
              /* ════════════════════ EDIT FORM ════════════════════ */
              <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">

                {/* Basic info */}
                <div>
                  <SectionTitle>Basic Info</SectionTitle>
                  <div className="space-y-3">
                    <Field label="Name *">
                      <input
                        type="text"
                        value={formData.name ?? ""}
                        onChange={set("name")}
                        className={inp}
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        value={formData.description ?? ""}
                        onChange={set("description")}
                        rows={2}
                        className={`${inp} resize-none`}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Product type">
                        <select
                          value={formData.type ?? "SIMPLE"}
                          onChange={set("type")}
                          className={inp}
                        >
                          <option value="SIMPLE">Simple</option>
                          <option value="SERVICE">Service</option>
                          <option value="BUNDLE">Bundle</option>
                        </select>
                      </Field>
                      <Field label="Unit">
                        <input
                          type="text"
                          value={formData.unit ?? "unit"}
                          onChange={set("unit")}
                          className={inp}
                          placeholder="unit, kg, pcs…"
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="SKU">
                        <input
                          type="text"
                          value={formData.sku ?? ""}
                          onChange={set("sku")}
                          className={inp}
                        />
                      </Field>
                      <Field label="Barcode">
                        <input
                          type="text"
                          value={formData.barcode ?? ""}
                          onChange={set("barcode")}
                          className={inp}
                          placeholder="EAN / UPC…"
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* Pricing */}
                <div>
                  <SectionTitle>Pricing</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Sale price *">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.salePrice ?? ""}
                        onChange={set("salePrice")}
                        className={inp}
                      />
                    </Field>
                    <Field label="Cost price">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costPrice ?? ""}
                        onChange={set("costPrice")}
                        className={inp}
                      />
                    </Field>
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* Organisation */}
                <div>
                  <SectionTitle>Organisation</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Category">
                      <select
                        value={formData.categoryId ?? ""}
                        onChange={set("categoryId")}
                        className={inp}
                      >
                        <option value="">— None —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Supplier">
                      <select
                        value={formData.supplierId ?? ""}
                        onChange={set("supplierId")}
                        className={inp}
                      >
                        <option value="">— None —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* Stock & tracking */}
                <div>
                  <SectionTitle>Stock &amp; Tracking</SectionTitle>
                  <div className="space-y-3">
                    <Field label="Low-stock alert threshold">
                      <input
                        type="number"
                        min="0"
                        value={formData.lowStockAlert ?? ""}
                        onChange={set("lowStockAlert")}
                        className={inp}
                        placeholder="Leave blank to disable"
                      />
                    </Field>
                    <div className="space-y-2 pt-1">
                      {[
                        { key: "trackStock", label: "Track stock quantity" },
                        { key: "batchTracking", label: "Batch / lot tracking" },
                        { key: "expiryTracking", label: "Expiry date tracking" },
                        { key: "isActive", label: "Product is active" },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={!!formData[key]}
                            onChange={set(key)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-sky-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* Metadata / device details */}
                <div>
                  <SectionTitle>
                    Device / Variant Details{" "}
                    <span className="normal-case text-slate-600">
                      (optional)
                    </span>
                  </SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Brand">
                      <input
                        type="text"
                        value={formData.brand ?? ""}
                        onChange={set("brand")}
                        className={inp}
                        placeholder="Apple, Samsung…"
                      />
                    </Field>
                    <Field label="Model">
                      <input
                        type="text"
                        value={formData.model ?? ""}
                        onChange={set("model")}
                        className={inp}
                        placeholder="iPhone 14 Pro…"
                      />
                    </Field>
                    <Field label="IMEI / Serial">
                      <input
                        type="text"
                        value={formData.imei ?? ""}
                        onChange={set("imei")}
                        className={inp}
                        placeholder="IMEI or serial number"
                      />
                    </Field>
                    <Field label="Color">
                      <input
                        type="text"
                        value={formData.color ?? ""}
                        onChange={set("color")}
                        className={inp}
                        placeholder="Black, Blue…"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ) : (
              /* ════════════════════ VIEW MODE ════════════════════ */
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="mb-4 text-sm font-semibold text-slate-100">
                  Product Information
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ["SKU", product.sku || "—"],
                    ["Barcode", product.barcode || "—"],
                    ["Type", product.type],
                    ["Unit", product.unit],
                    [
                      "Description",
                      product.description || "—",
                    ],
                    [
                      "Category",
                      product.category?.name || "—",
                    ],
                    [
                      "Supplier",
                      product.supplier?.name || "—",
                    ],
                    [
                      "Cost price",
                      `$${Number(product.costPrice || 0).toFixed(2)}`,
                    ],
                    [
                      "Sale price",
                      `$${Number(product.salePrice).toFixed(2)}`,
                    ],
                    ["Margin", `${margin}%`],
                    [
                      "Low-stock alert",
                      product.lowStockAlert ?? "—",
                    ],
                    [
                      "Track stock",
                      product.trackStock ? "Yes" : "No",
                    ],
                    [
                      "Batch tracking",
                      product.batchTracking ? "Yes" : "No",
                    ],
                    [
                      "Expiry tracking",
                      product.expiryTracking ? "Yes" : "No",
                    ],
                    [
                      "Active",
                      product.isActive ? (
                        <span className="text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      ),
                    ],
                  ].map(([key, val]) => (
                    <div key={key} className="contents">
                      <dt className="text-slate-400">{key}:</dt>
                      <dd className="font-semibold text-white">{val}</dd>
                    </div>
                  ))}

                  {/* Metadata rows */}
                  {product.metadata &&
                    Object.entries(product.metadata).map(([k, v]) =>
                      v ? (
                        <div key={k} className="contents">
                          <dt className="capitalize text-slate-400">{k}:</dt>
                          <dd className="font-semibold text-white">{v}</dd>
                        </div>
                      ) : null
                    )}
                </dl>
              </div>
            )}

            {/* ── Stock by location ── */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-100">
                Stock by Location
              </h2>
              {product.stocks.length > 0 ? (
                <div className="space-y-2">
                  {product.stocks.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {stock.location.name}
                        </p>
                        {stock.location.code && (
                          <p className="text-xs text-slate-400">
                            {stock.location.code}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {stock.quantity}
                        </p>
                        {stock.minQuantity > 0 && (
                          <p className="text-xs text-slate-400">
                            Min: {stock.minQuantity}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No stock assigned to any location.
                </p>
              )}
            </div>

            {/* ── Recent stock movements ── */}
            {movements.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="mb-4 text-sm font-semibold text-slate-100">
                  Recent Stock Movements
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {["Date", "Type", "Qty", "Location", "By"].map((h) => (
                          <th
                            key={h}
                            className={`p-2 text-slate-400 ${h === "Qty" ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id} className="border-b border-slate-800/50">
                          <td className="p-2">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <span className="rounded bg-sky-900/30 px-2 py-0.5 text-sky-300">
                              {m.type}
                            </span>
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {m.quantity > 0 ? "+" : ""}
                            {m.quantity}
                          </td>
                          <td className="p-2">{m.location.name}</td>
                          <td className="p-2 text-slate-400">
                            {m.user?.fullName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Inventory summary */}
            <div className="rounded-xl border border-sky-800/50 bg-sky-900/20 p-4">
              <h3 className="mb-3 text-sm font-semibold text-sky-300">
                Inventory Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-sky-300">Total Stock:</span>
                  <span className="text-xl font-bold text-white">
                    {totalStock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-300">Inventory Value:</span>
                  <span className="font-bold text-white">
                    ${totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-300">Tracked:</span>
                  <span className="text-white">
                    {product.trackStock ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-300">Batch tracking:</span>
                  <span className="text-white">
                    {product.batchTracking ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-300">Expiry tracking:</span>
                  <span className="text-white">
                    {product.expiryTracking ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales history */}
            <div className="rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-4">
              <h3 className="mb-2 text-sm font-semibold text-emerald-300">
                Sales History
              </h3>
              <p className="text-2xl font-bold text-white">
                {product.totalSales}
              </p>
              <p className="text-xs text-emerald-300">Units sold</p>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-300">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href={`/inventory/adjustments?product=${productId}`}
                  className="block w-full rounded-lg bg-sky-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-sky-500"
                >
                  Adjust Stock
                </Link>
                <Link
                  href={`/inventory/transfers?product=${productId}`}
                  className="block w-full rounded-lg bg-purple-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-purple-500"
                >
                  Transfer Stock
                </Link>
                <Link
                  href={`/inventory/movements?product=${productId}`}
                  className="block w-full rounded-lg bg-slate-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-600"
                >
                  View History
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
