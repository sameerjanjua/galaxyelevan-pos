import { ROLES } from "./auth";

/**
 * Server-side helper for API routes.
 * Resolves which locationId to filter by, based on the user's role
 * and the locationId requested from the client (sidebar selection).
 *
 * Rules:
 *  - Owner:                   trusts requestedLocationId (or no filter if null)
 *  - Manager (global):        trusts requestedLocationId (or no filter if null)
 *  - Manager (assigned):      always enforces user.locationId
 *  - Staff:                   always enforces user.locationId
 *
 * @param {object} user — from requireUser()
 * @param {string|null} requestedLocationId — from query param
 * @returns {{ locationId?: string }} — Prisma where fragment
 */
export function resolveLocationFilter(user, requestedLocationId) {
  if (!user) return {};

  const isOwner = user.role === ROLES.OWNER;
  const isGlobalManager =
    user.role === ROLES.MANAGER && !user.locationId;

  if (isOwner || isGlobalManager) {
    // Trusted: use whatever the client selected
    if (requestedLocationId) {
      return { locationId: requestedLocationId };
    }
    return {}; // No filter = all locations
  }

  // Manager (assigned) or Staff — always enforce their assigned location
  if (user.locationId) {
    return { locationId: user.locationId };
  }

  // Fallback: no location assigned and not global — block everything
  return { locationId: "UNASSIGNED_RESTRICTED" };
}
