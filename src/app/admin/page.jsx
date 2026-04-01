'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;

    const fetchData = async () => {
      try {
        const [businessesRes, analyticsRes] = await Promise.all([
          fetch("/api/admin/businesses"),
          fetch("/api/admin/analytics/finance"),
        ]);

        if (!businessesRes.ok || !analyticsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const businessesData = await businessesRes.json();
        const analyticsData = await analyticsRes.json();

        setBusinesses(businessesData.slice(0, 5));
        setStats(analyticsData.overall);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-gray-300">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm font-medium">Total Businesses</div>
          <div className="text-3xl font-bold text-white mt-2">{businesses.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm font-medium">Total Revenue</div>
          <div className="text-3xl font-bold text-white mt-2">
            ${Number(stats?.totalRevenue || 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm font-medium">Total Sales</div>
          <div className="text-3xl font-bold text-white mt-2">{stats?.totalSalesCount || 0}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm font-medium">Total Tax Collected</div>
          <div className="text-3xl font-bold text-white mt-2">
            ${Number(stats?.totalTax || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recent Businesses */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Recent Businesses</h3>
          <Link href="/admin/businesses/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            + Add Business
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-gray-300 font-medium text-sm">Name</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium text-sm">Industry</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium text-sm">Status</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium text-sm">Revenue</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium text-sm">Users</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {businesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-700 transition">
                  <td className="px-6 py-4 text-white">{business.name}</td>
                  <td className="px-6 py-4 text-gray-300">{business.industry || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      business.isSuspended
                        ? "bg-red-900 text-red-200"
                        : "bg-green-900 text-green-200"
                    }`}>
                      {business.isSuspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">${Number(business.stats?.totalRevenue || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-300">{business.stats?.userCount || 0}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/businesses/${business.id}`} className="text-blue-400 hover:text-blue-300">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}