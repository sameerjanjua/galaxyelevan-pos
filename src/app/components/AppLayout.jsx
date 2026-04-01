"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchCurrentUser } from "@/store/auth/authThunks";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();

  const [isAdminContext, setIsAdminContext] = useState(false);

  useEffect(() => {
    // Determine admin context on client side only to avoid hydration mismatch
    const isAdmin = window.location.hostname.startsWith("admin.");
    setIsAdminContext(isAdmin);

    // Only fetch regular user info if NOT in admin context
    if (!isAdmin) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

  // Don't show regular business sidebar on login, register, admin pages, OR admin subdomain
  const shouldShowSidebar = !(
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    isAdminContext
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      {shouldShowSidebar && <Sidebar />}
      <main
        className={`flex-1 transition-all duration-300 ${shouldShowSidebar ? "ml-64" : "ml-0"
          }`}
      >
        {children}
      </main>
    </div>
  );
}
