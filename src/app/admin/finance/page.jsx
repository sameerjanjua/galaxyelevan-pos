'use client';

import { useEffect, useState } from "react";

export default function FinancePage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const res = await fetch("/api/admin/analytics/finance");
        if (!res.ok) throw new Error("Failed to fetch finance data");
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  if (loading) return <div className="text-gray-300">Loading finance analytics...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!analytics) return <div className="text-gray-400">No data available</div>;

  const { overall, byBusiness, byPaymentMethod, monthlyTrend } = analytics;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Finance Analytics</h1>
        <p className="text-gray-400">Platform-wide financial performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Total Revenue</div>
          <div className="text-3xl font-bold text-white mt-2">
            ${Number(overall?.totalRevenue || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2">{overall?.totalSalesCount || 0} sales</div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Total Subtotal</div>
          <div className="text-3xl font-bold text-white mt-2">
            ${Number(overall?.totalSubtotal || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Tax Collected</div>
          <div className="text-3xl font-bold text-white mt-2">
            ${Number(overall?.totalTax || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {((overall?.totalTax || 0) / (overall?.totalRevenue || 1) * 100).toFixed(1)}% of revenue
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Total Discount</div>
          <div className="text-3xl font-bold text-white mt-2">
            ${Number(overall?.totalDiscount || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Revenue Trend (Last 12 Months)</h2>
        <div className="flex items-end justify-between h-64 space-x-2">
          {monthlyTrend && monthlyTrend.map((month, idx) => {
            const maxRevenue = Math.max(...monthlyTrend.map(m => m.revenue || 0));
            const heightPercent = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group">
                <div
                  className="w-full bg-blue-600 rounded-t hover:bg-blue-500 transition relative"
                  style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                  title={`${month.month}: $${Number(month.revenue).toFixed(2)}`}
                />
                <div className="text-xs text-gray-400 mt-2 text-center truncate w-full">
                  {month.month.substring(0, 3)}
                </div>
                <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 absolute bottom-32 bg-gray-700 px-2 py-1 rounded whitespace-nowrap">
                  ${Number(month.revenue).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by Business */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Revenue by Business</h2>
          <div className="space-y-3">
            {byBusiness && byBusiness.length > 0 ? (
              byBusiness.map((business, idx) => {
                const totalRevenue = overall?.totalRevenue || 1;
                const percentage = (business.revenue / totalRevenue) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="text-white font-medium">{business.tenantName}</div>
                        <div className="text-xs text-gray-500">{business.salesCount} sales</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">${Number(business.revenue).toFixed(2)}</div>
                        <div className="text-xs text-gray-400">{(Number(percentage).toFixed(1))}%</div>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400">No business revenue data</p>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Payment Methods</h2>
          <div className="space-y-3">
            {byPaymentMethod && byPaymentMethod.length > 0 ? (
              byPaymentMethod.map((method, idx) => {
                const totalRevenue = overall?.totalRevenue || 1;
                const percentage = (method.amount / totalRevenue) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="text-white font-medium">{method.name}</div>
                        <div className="text-xs text-gray-500">{method.count} transactions</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">${method.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-600 h-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400">No payment method data</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Business</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Revenue</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Sales Count</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Avg Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {byBusiness && byBusiness.map((business, idx) => (
              <tr key={idx} className="hover:bg-gray-700 transition">
                <td className="px-6 py-4 text-white font-medium">{business.tenantName}</td>
                <td className="px-6 py-4 text-white">${(Number(business.revenue).toFixed(2))}</td>
                <td className="px-6 py-4 text-gray-300">{business.salesCount}</td>
                <td className="px-6 py-4 text-gray-300">
                  ${business.salesCount > 0 ? (Number(business.revenue) / Number(business.salesCount)).toFixed(2) : "0.00"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
