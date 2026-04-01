'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchCurrentUser } from "../../store/auth/authThunks";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.auth.user);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/super-admin-logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        // Optionally read error message from response body
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Logout failed on server");
      }

      // Optional: Clear any client-side user state here
      // e.g., clearUserContext(), localStorage.removeItem('user'), etc.

      // Redirect to login page
      router.push("/auth/admin-login");
    } catch (error) {
      console.error("Logout error:", error);
      // Show user-friendly error message (e.g., using toast or alert)
      alert("Logout failed. Please try again.");
      setLoading(false); // Ensure loading is turned off only on error
    }
    // No need to setLoading(false) on success because the component will unmount
  };

  const isActive = (path) => pathname === path || pathname.startsWith(path + "/");

  const navItems = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "Businesses", path: "/admin/businesses", icon: "🏢" },
    { label: "Analytics", path: "/admin/analytics", icon: "📈" },
    { label: "Finance", path: "/admin/finance", icon: "💰" },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      await dispatch(fetchCurrentUser());
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) {
      return router.push("/auth/admin-login");
    }
    else if (user && !user.isSuperAdmin) {
      return router.push(`/${user.tenantSlug}/dashboard`);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">POS Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Platform Management</p>
        </div>

        <nav className="mt-6 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive(item.path)
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {navItems.find((item) => isActive(item.path))?.label || "Admin"}
          </h2>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
          >
            {loading ? "Logging out..." : "Logout"}
          </button>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
