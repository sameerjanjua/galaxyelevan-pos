"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedLocation } from "@/store/location/locationSlice";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { LocationSelector } from "@/components/common/location-selector/LocationSelector";

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { activeLocationId, canSwitch, locations } = useActiveLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navigationGroups = [
    {
      title: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/pos", label: "POS", icon: "🛒" },
        ...(user?.role === "OWNER" || user?.role === "MANAGER"
          ? [{ href: "/approvals", label: "Approvals", icon: "🛡️" }]
          : []),
      ],
    },
    ...(user?.role === "OWNER" || user?.role === "MANAGER"
      ? [
        {
          title: "Products",
          items: [
            { href: "/products", label: "All Products", icon: "📦" },
            { href: "/products/categories", label: "Categories", icon: "🏷️" },
            { href: "/products/management", label: "Management", icon: "⚙️" },
            { href: "/products/import", label: "Bulk Import", icon: "📥" },
          ],
        },
        {
          title: "Inventory",
          items: [
            { href: "/inventory", label: "Dashboard", icon: "📈" },
            { href: "/inventory/stock-levels", label: "Stock Levels", icon: "📍" },
            { href: "/inventory/adjustments", label: "Adjustments", icon: "🔧" },
            { href: "/inventory/transfers", label: "Transfers", icon: "🔄" },
            { href: "/inventory/movements", label: "Movements", icon: "📋" },
          ],
        },
        {
          title: "Operations",
          items: [
            { href: "/customers", label: "Customers", icon: "👥" },
            { href: "/reports", label: "Reports", icon: "📄" },
            ...(user?.role === "OWNER" ? [{ href: "/settings/locations", label: "Locations", icon: "🏢" }] : []),
            { href: "/settings/users", label: "Team", icon: "👤" },
          ],
        },
      ]
      : []),
  ];

  const isActive = (href) => pathname === href;

  return (
    <aside
      className={`${collapsed ? "w-20" : "w-64"
        } max-h-screen overflow-y-auto bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col fixed left-0 top-0 z-40`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!collapsed && <h1 className="text-lg font-bold text-slate-50">{user?.tenantName || "POS"}</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-slate-800 rounded transition"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Location Selector */}
      {!collapsed && locations.length > 0 && (
        <div className="p-4 border-b border-slate-800">
          <LocationSelector
            locations={locations}
            selectedId={activeLocationId}
            onSelect={
              canSwitch
                ? (id) => dispatch(setSelectedLocation(id))
                : undefined
            }
            canSwitch={canSwitch}
          />
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto">
        <div className="py-4 space-y-1">
          {navigationGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {!collapsed && (
                <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </p>
              )}
              <div className={!collapsed ? "space-y-1" : "space-y-4"}>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : ""}
                      className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition ${active
                        ? "bg-sky-500/20 text-sky-400 border-r-2 border-sky-500"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-50"
                        } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition ${pathname === "/profile"
            ? "bg-sky-500/20 text-sky-400 border-r-2 border-sky-500"
            : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-50"
            } ${collapsed ? "justify-center px-0" : ""}`}
        >
          <span className="text-lg">👤</span>
          {!collapsed && <span>Profile</span>}
        </Link>
      </div>
    </aside>
  );
}
