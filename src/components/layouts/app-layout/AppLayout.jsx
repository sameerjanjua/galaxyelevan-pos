"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/auth/authSlice";
import { setLocations, initializeLocationForUser } from "@/store/location/locationSlice";
import { fetchCurrentUser } from "@/store/auth/authThunks";
import { fetchLocations } from "@/store/location/locationThunks";
import { Sidebar } from "../sidebar/Sidebar";

export default function AppLayout({ children, initialUser = null, initialLocations = null }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const hasInitializedRef = useRef(false);

  const [isAdminContext, setIsAdminContext] = useState(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    // Determine admin context on client side only to avoid hydration mismatch
    const isAdmin = window.location.hostname.startsWith("admin.");
    setIsAdminContext(isAdmin);

    // Hydrate from the server when available; otherwise fall back to client fetches.
    if (!isAdmin) {
      if (initialUser) {
        dispatch(setCredentials({ user: initialUser, token: null }));
      } else {
        dispatch(fetchCurrentUser());
      }

      if (Array.isArray(initialLocations)) {
        dispatch(setLocations(initialLocations));

        // Initialize location context for this user
        if (initialUser) {
          dispatch(initializeLocationForUser({
            user: initialUser,
            locations: initialLocations,
          }));
        }

        // If server hydration has no locations, fetch once from API on the client.
        if (initialLocations.length === 0) {
          dispatch(fetchLocations());
        }
      } else {
        dispatch(fetchLocations());
      }
    }
  }, [dispatch, initialUser, initialLocations]);

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
