"use client";

import { useState } from "react";

export default function BulkImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/tenant/products/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Import failed");
        return;
      }

      setResults(data.results);
      setFile(null);
    } catch (err) {
      setError("Network error during import");
      console.error("Import error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Bulk Product Import</h1>
          <p className="text-slate-400">
            Upload a CSV file to import multiple products at once
          </p>
        </header>

        <div className="space-y-6">
          {/* CSV Template Info */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">
              CSV Format
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Your CSV file should have the following columns:
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs text-slate-300 w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2">Column</th>
                    <th className="text-left py-2 px-2">Required</th>
                    <th className="text-left py-2 px-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">name</td>
                    <td className="py-2 px-2">✓</td>
                    <td className="py-2 px-2">Product name</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">salePrice</td>
                    <td className="py-2 px-2">✓</td>
                    <td className="py-2 px-2">Sale price (number)</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">sku</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Product SKU (must be unique)</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">barcode</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Product barcode (must be unique)</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">costPrice</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Cost price (number)</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">initialStock</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Initial stock quantity</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">lowStockAlert</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Low stock alert threshold</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-2 font-mono">description</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Product description</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-mono">unit</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Unit of measurement (default: unit)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Example: name,salePrice,sku,barcode,costPrice,initialStock,lowStockAlert
              <br />
              iPhone 15,999,IP15-001,5901234567890,549,50,10
            </p>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/50 p-8 text-center hover:border-slate-600 transition">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="space-y-2">
                  <div className="text-2xl">📁</div>
                  <p className="text-sm font-medium text-slate-200">
                    {file ? file.name : "Click to select CSV file"}
                  </p>
                  <p className="text-xs text-slate-400">
                    or drag and drop
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full rounded-lg bg-sky-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {uploading ? "Importing..." : "Import Products"}
            </button>
          </form>

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-sm font-semibold text-slate-100 mb-4">
                  Import Results
                </h2>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg bg-green-950/50 border border-green-800 p-4">
                    <p className="text-xs text-green-400 font-medium">
                      Success
                    </p>
                    <p className="text-2xl font-bold text-green-300 mt-1">
                      {results.success.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-950/50 border border-red-800 p-4">
                    <p className="text-xs text-red-400 font-medium">Errors</p>
                    <p className="text-2xl font-bold text-red-300 mt-1">
                      {results.errors.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                    <p className="text-xs text-slate-400 font-medium">
                      Skipped
                    </p>
                    <p className="text-2xl font-bold text-slate-300 mt-1">
                      {results.skipped}
                    </p>
                  </div>
                </div>

                {results.success.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-green-400 mb-3">
                      Successfully Created Products
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.success.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-slate-950/80 border border-slate-700 p-3 text-xs"
                        >
                          <p className="text-slate-100">
                            <span className="font-mono text-green-400">
                              Row {item.row}
                            </span>
                            {" — "}
                            {item.name}
                            {item.sku && (
                              <span className="text-slate-400">
                                {" "}(SKU: {item.sku})
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-red-400 mb-3">
                      Errors
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.errors.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-slate-950/80 border border-red-800 p-3 text-xs"
                        >
                          <p className="text-red-400">
                            <span className="font-mono">Row {item.row}</span>
                            {": "}
                            {item.error}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setResults(null);
                  setFile(null);
                }}
                className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900 transition"
              >
                Import Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
