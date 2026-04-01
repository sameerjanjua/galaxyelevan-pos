import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createProduct(formData) {
  "use server";

  const user = await requireUser();

  // ── Core fields ──────────────────────────────────────────────────────────
  const name = formData.get("name");
  const sku = formData.get("sku");
  const barcode = formData.get("barcode");
  const description = formData.get("description");
  const type = formData.get("type") || "SIMPLE";
  const unit = formData.get("unit") || "unit";

  // ── Pricing ───────────────────────────────────────────────────────────────
  const costPrice = formData.get("costPrice");
  const salePrice = formData.get("salePrice");

  // ── Relations ─────────────────────────────────────────────────────────────
  const categoryId = formData.get("categoryId");
  const supplierId = formData.get("supplierId");

  // ── Stock / toggles ───────────────────────────────────────────────────────
  const trackStock = formData.get("trackStock") === "on";
  const batchTracking = formData.get("batchTracking") === "on";
  const expiryTracking = formData.get("expiryTracking") === "on";
  const isActive = formData.get("isActive") !== "off"; // default on
  const lowStockAlertRaw = formData.get("lowStockAlert");
  const lowStockAlert =
    lowStockAlertRaw && lowStockAlertRaw.trim() !== ""
      ? parseInt(lowStockAlertRaw, 10)
      : null;

  // ── Metadata (vertical-specific) ──────────────────────────────────────────
  const brand = formData.get("brand");
  const model = formData.get("model");
  const imei = formData.get("imei");
  const color = formData.get("color");

  // ── Validation ────────────────────────────────────────────────────────────
  if (typeof name !== "string" || name.trim().length === 0) return;
  if (typeof salePrice !== "string") return;
  const numericSalePrice = Number(salePrice);
  if (Number.isNaN(numericSalePrice)) return;
  const numericCostPrice = costPrice ? Number(costPrice) : numericSalePrice;

  const str = (v) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

  await prisma.product.create({
    data: {
      name: name.trim(),
      sku: str(sku) ?? null,
      barcode: str(barcode) ?? null,
      description: str(description) ?? null,
      type,
      unit,
      costPrice: numericCostPrice,
      salePrice: numericSalePrice,
      tenantId: user.tenantId,
      trackStock,
      batchTracking,
      expiryTracking,
      isActive,
      lowStockAlert: !Number.isNaN(lowStockAlert) ? lowStockAlert : null,
      categoryId: str(categoryId) ?? null,
      supplierId: str(supplierId) ?? null,
      metadata:
        str(brand) || str(model) || str(imei) || str(color)
          ? {
              brand: str(brand),
              model: str(model),
              imei: str(imei),
              color: str(color),
            }
          : undefined,
    },
  });

  revalidatePath("/products");
}

// ─── Shared input / label style ─────────────────────────────────────────────
const input =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50";
const label = "mb-1 block text-xs font-medium text-slate-300";

export default async function ProductsPage() {
  const user = await requireUser();

  const [products, categories, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { category: true },
    }),
    prisma.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* ── Header ── */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Products</h1>
            <p className="text-xs text-slate-400">
              Manage items for cafes, mobile shops, clothing stores and more.
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900"
          >
            Back to dashboard
          </a>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
          {/* ── Products table ── */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Current products&nbsp;
              <span className="text-xs font-normal text-slate-500">
                ({products.length})
              </span>
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-900">
                  <tr>
                    {["Name", "SKU", "Type", "Category", "Cost", "Sale Price", "Active"].map(
                      (h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-300"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No products yet. Add your first item using the form on
                        the right.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/40">
                        <td className="px-3 py-2 text-slate-100">{p.name}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {p.sku ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{p.type}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {p.category?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          ${Number(p.costPrice).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-slate-100">
                          ${Number(p.salePrice).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {p.isActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-700/40 px-2 py-0.5 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Add product form ── */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-100">
              Add product
            </h2>
            <form action={createProduct} className="space-y-4 text-sm">

              {/* ── Section: Basic info ── */}
              <fieldset className="space-y-3">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Basic Info
                </legend>

                {/* Name */}
                <div>
                  <label className={label}>
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    className={input}
                    placeholder="Espresso, iPhone 14 Pro, T-shirt…"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={label}>Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className={`${input} resize-none`}
                    placeholder="Short product description…"
                  />
                </div>

                {/* Type + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Product type</label>
                    <select name="type" className={input}>
                      <option value="SIMPLE">Simple</option>
                      <option value="SERVICE">Service</option>
                      <option value="BUNDLE">Bundle</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Unit</label>
                    <input
                      name="unit"
                      className={input}
                      defaultValue="unit"
                      placeholder="unit, kg, pcs…"
                    />
                  </div>
                </div>

                {/* SKU + Barcode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>SKU</label>
                    <input
                      name="sku"
                      className={input}
                      placeholder="AUTO-001"
                    />
                  </div>
                  <div>
                    <label className={label}>Barcode</label>
                    <input
                      name="barcode"
                      className={input}
                      placeholder="EAN / UPC…"
                    />
                  </div>
                </div>
              </fieldset>

              <hr className="border-slate-800" />

              {/* ── Section: Pricing ── */}
              <fieldset className="space-y-3">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Pricing
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>
                      Sale price <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="salePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className={input}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={label}>Cost price</label>
                    <input
                      name="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className={input}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </fieldset>

              <hr className="border-slate-800" />

              {/* ── Section: Relations ── */}
              <fieldset className="space-y-3">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Organisation
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Category</label>
                    <select name="categoryId" className={input}>
                      <option value="">— None —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Supplier</label>
                    <select name="supplierId" className={input}>
                      <option value="">— None —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>

              <hr className="border-slate-800" />

              {/* ── Section: Stock & tracking ── */}
              <fieldset className="space-y-3">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Stock &amp; Tracking
                </legend>

                {/* Low stock alert */}
                <div>
                  <label className={label}>Low-stock alert threshold</label>
                  <input
                    name="lowStockAlert"
                    type="number"
                    min="0"
                    className={input}
                    placeholder="e.g. 5 (leave blank to disable)"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  {[
                    { name: "trackStock", label: "Track stock quantity", defaultChecked: true },
                    { name: "batchTracking", label: "Batch / lot tracking" },
                    { name: "expiryTracking", label: "Expiry date tracking" },
                    { name: "isActive", label: "Product is active", defaultChecked: true },
                  ].map((toggle) => (
                    <label
                      key={toggle.name}
                      className="inline-flex w-full cursor-pointer items-center gap-2 text-xs text-slate-300"
                    >
                      <input
                        type="checkbox"
                        name={toggle.name}
                        defaultChecked={toggle.defaultChecked}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 accent-sky-500"
                      />
                      {toggle.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <hr className="border-slate-800" />

              {/* ── Section: Metadata (mobile / electronics) ── */}
              <fieldset className="space-y-3">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Device / Variant Details <span className="normal-case text-slate-600">(optional)</span>
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Brand</label>
                    <input
                      name="brand"
                      className={input}
                      placeholder="Apple, Samsung…"
                    />
                  </div>
                  <div>
                    <label className={label}>Model</label>
                    <input
                      name="model"
                      className={input}
                      placeholder="iPhone 14 Pro…"
                    />
                  </div>
                  <div>
                    <label className={label}>IMEI / Serial</label>
                    <input
                      name="imei"
                      className={input}
                      placeholder="IMEI or serial number"
                    />
                  </div>
                  <div>
                    <label className={label}>Color</label>
                    <input
                      name="color"
                      className={input}
                      placeholder="Black, Blue…"
                    />
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400 active:scale-95"
              >
                Save product
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
