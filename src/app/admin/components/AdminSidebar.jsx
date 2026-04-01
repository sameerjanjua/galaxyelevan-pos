"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "Businesses", path: "/admin/businesses", icon: "🏢" },
    { label: "Analytics", path: "/admin/analytics", icon: "📈" },
    { label: "Finance", path: "/admin/finance", icon: "💰" },
];

export function AdminSidebar() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path || pathname.includes(`${path}/`);

    return (
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
    );
}
