'use client';

import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("revenue");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/admin/analytics/businesses");
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();
        setBusinesses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const sortedBusinesses = [...businesses].sort((a, b) => {
    switch (sortBy) {
      case "revenue":
        return (b.metrics?.totalRevenue || 0) - (a.metrics?.totalRevenue || 0);
      case "sales":
        return (b.metrics?.totalSales || 0) - (a.metrics?.totalSales || 0);
      case "users":
        return (b.metrics?.activeUsers || 0) - (a.metrics?.activeUsers || 0);
      case "aov":
        return (b.metrics?.averageOrderValue || 0) - (a.metrics?.averageOrderValue || 0);
      default:
        return 0;
    }
  });

  if (loading) return <div className="text-gray-300">Loading analytics...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  const totalRevenue = businesses.reduce((sum, b) => sum + (Number(b.metrics?.totalRevenue) || 0), 0);
  const totalSales = businesses.reduce((sum, b) => sum + (Number(b.metrics?.totalSales) || 0), 0);
  const totalUsers = businesses.reduce((sum, b) => sum + (Number(b.metrics?.activeUsers) || 0), 0);
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Business Analytics</h1>
        <p className="text-gray-400">Performance metrics for all businesses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Total Revenue</div>
          <div className="text-3xl font-bold text-white mt-2">${Number(totalRevenue).toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">{businesses.length} businesses</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Total Sales</div>
          <div className="text-3xl font-bold text-white mt-2">{totalSales}</div>
          <div className="text-xs text-gray-500 mt-2">Transactions</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Total Users</div>
          <div className="text-3xl font-bold text-white mt-2">{totalUsers}</div>
          <div className="text-xs text-gray-500 mt-2">Active across all</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-gray-400 text-sm font-medium">Avg Order Value</div>
          <div className="text-3xl font-bold text-white mt-2">${avgOrderValue.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">Per transaction</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Business Performance</h2>
        <div className="flex items-center space-x-2">
          <label className="text-gray-400 text-sm">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="revenue">Revenue</option>
            <option value="sales">Sales Count</option>
            <option value="users">Active Users</option>
            <option value="aov">Avg Order Value</option>
          </select>
        </div>
      </div>

      {/* Business Analytics Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Business</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Total Sales</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Revenue</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Avg Order Value</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Active Users</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Products</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Monthly Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedBusinesses.map((business) => (
              <tr key={business.tenantId} className="hover:bg-gray-700 transition">
                <td className="px-6 py-4">
                  <div className="text-white font-medium">{business.tenantName}</div>
                  <div className="text-xs text-gray-500">{business.slug}</div>
                </td>
                <td className="px-6 py-4 text-gray-300">{business.metrics?.totalSales || 0}</td>
                <td className="px-6 py-4 text-white font-medium">
                  ${Number(business.metrics?.totalRevenue || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-gray-300">
                  ${Number(business.metrics?.averageOrderValue || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-gray-300">{business.metrics?.activeUsers || 0}</td>
                <td className="px-6 py-4 text-gray-300">{business.metrics?.activeProducts || 0}</td>
                <td className="px-6 py-4 text-white">
                  ${Number(business.metrics?.monthlyRevenue || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* No Data State */}
      {businesses.length === 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No business data available yet</p>
        </div>
      )}
    </div>
  );
}
