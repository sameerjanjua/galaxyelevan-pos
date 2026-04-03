'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;

    const fetchBusinesses = async () => {
      try {
        const res = await fetch("/api/admin/businesses");
        if (!res.ok) throw new Error("Failed to fetch businesses");
        const data = await res.json();
        setBusinesses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  if (loading) return <div className="text-gray-300">Loading businesses...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">All Businesses</h1>
        <Link href="/admin/businesses/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          + Add New Business
        </Link>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Name</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Slug</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Industry</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Status</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Revenue</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Users</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Sales</th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {businesses.map((business) => (
              <tr key={business.id} className="hover:bg-gray-700 transition">
                <td className="px-6 py-4 text-white font-medium">{business.name}</td>
                <td className="px-6 py-4 text-gray-300 text-sm">{business.slug}</td>
                <td className="px-6 py-4 text-gray-300">{business.industry || "—"}</td>
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
                <td className="px-6 py-4 text-gray-300">{business.stats?.salesCount || 0}</td>
                <td className="px-6 py-4">
                  <Link href={`/admin/businesses/${business.id}`} className="text-blue-400 hover:text-blue-300 mr-4">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
