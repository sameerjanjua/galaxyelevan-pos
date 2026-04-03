"use client";

import { useSelector } from "react-redux";

/**
 * Hook that returns the effective active location based on user role
 * and sidebar selection. This is the SINGLE SOURCE OF TRUTH for
 * what location the app should filter data by.
 *
 * Rules:
 *  - Owner (locationId=null):          reads Redux selectedLocationId (dropdown)
 *  - Manager (locationId=null/global): reads Redux selectedLocationId (dropdown)
 *  - Manager (locationId=assigned):    always returns user.locationId (fixed)
 *  - Staff (locationId=assigned):      always returns user.locationId (fixed)
 */
export function useActiveLocation() {
  const user = useSelector((state) => state.auth.user);
  const locations = useSelector((state) => state.location.locations);
  const selectedLocationId = useSelector(
    (state) => state.location.selectedLocationId
  );

  if (!user) {
    return {
      activeLocationId: null,
      activeLocationName: null,
      isAllLocations: true,
      canSwitch: false,
      locations: [],
    };
  }

  // Determine if this user can switch locations
  const isOwner = user.role === "OWNER";
  const isGlobalManager = user.role === "MANAGER" && !user.locationId;
  const canSwitch = isOwner || isGlobalManager;

  if (canSwitch) {
    // Owner or global Manager — use sidebar selection from Redux
    const activeLocationId = selectedLocationId || null;
    const activeLoc = locations.find((l) => l.id === activeLocationId);

    return {
      activeLocationId,
      activeLocationName: activeLoc?.name || null,
      isAllLocations: !activeLocationId,
      canSwitch: true,
      locations,
    };
  }

  // Manager (assigned) or Staff — fixed to their location
  const userLoc = locations.find((l) => l.id === user.locationId);

  return {
    activeLocationId: user.locationId,
    activeLocationName: userLoc?.name || "Assigned Location",
    isAllLocations: false,
    canSwitch: false,
    locations,
  };
}
