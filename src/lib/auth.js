import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "pos_session";
const SUPER_ADMIN_SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-session-secret";

const KEY = new TextEncoder().encode(SESSION_SECRET);

async function encodeSession(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(KEY);
}

export async function decodeSession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, KEY, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

// Regular user session functions
export async function createSession(userId, tenantId, tenantSlug, tenantName) {
  const payload = {
    userId,
    tenantId,
    tenantSlug,
    tenantName,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  const token = await encodeSession(payload);
  const cookieStore = await cookies();

  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };

  // Set domain attribute for cross-subdomain sharing
  try {
     const host = (await headers()).get("host") || "";
     const hostname = host.split(":")[0];
     if (hostname.endsWith("lvh.me")) {
        cookieOptions.domain = ".lvh.me";
     } else if (process.env.NODE_ENV === "production" && !hostname.includes("localhost")) {
        // Extract base domain (e.g., .pos-shop.com)
        const parts = hostname.split(".");
        if (parts.length >= 2) {
           cookieOptions.domain = "." + parts.slice(-2).join(".");
        }
     }
  } catch (e) {
     // Headers not available
  }

  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions);
}

export async function clearSession() {
  const cookieStore = await cookies();

  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  // Ensure domain is set for cross-subdomain cookie clearing
  try {
    const host = (await headers()).get("host") || "";
    const hostname = host.split(":")[0];
    if (hostname.endsWith("lvh.me")) {
      cookieOptions.domain = ".lvh.me";
    } else if (
      process.env.NODE_ENV === "production" &&
      !hostname.includes("localhost")
    ) {
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        cookieOptions.domain = "." + parts.slice(-2).join(".");
      }
    }
  } catch (e) {
    // Headers not available
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", cookieOptions);
}

// Super admin session functions
export async function createSuperAdminSession(superAdminId) {
  const payload = {
    superAdminId,
    isSuperAdmin: true,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  const token = await encodeSession(payload);
  const cookieStore = await cookies();
  
  // Set cookie with base domain if on lvh.me or production
  // This allows the session to be shared across subdomains
  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };

  // Set domain attribute for cross-subdomain sharing
  try {
     const host = (await headers()).get("host") || "";
     const hostname = host.split(":")[0];
     
     if (hostname.endsWith("lvh.me")) {
        cookieOptions.domain = ".lvh.me";
     } else if (process.env.NODE_ENV === "production" && !hostname.includes("localhost")) {
        // Extract base domain (e.g., .pos-shop.com)
        const parts = hostname.split(".");
        if (parts.length >= 2) {
           cookieOptions.domain = "." + parts.slice(-2).join(".");
        }
     }
  } catch (e) {
     // Headers not available
  }

  cookieStore.set(SUPER_ADMIN_SESSION_COOKIE_NAME, token, cookieOptions);
}

export async function clearSuperAdminSession() {
  const cookieStore = await cookies();

  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  // Ensure domain is set for cross-subdomain cookie clearing
  try {
    const host = (await headers()).get("host") || "";
    const hostname = host.split(":")[0];
    if (hostname.endsWith("lvh.me")) {
      cookieOptions.domain = ".lvh.me";
    } else if (
      process.env.NODE_ENV === "production" &&
      !hostname.includes("localhost")
    ) {
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        cookieOptions.domain = "." + parts.slice(-2).join(".");
      }
    }
  } catch (e) {
    // Headers not available
  }

  cookieStore.set(SUPER_ADMIN_SESSION_COOKIE_NAME, "", cookieOptions);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  // Check for regular user session first
  let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let payload = await decodeSession(token);

  if (payload) {
    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        tenantId: payload.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        locationId: true,
      },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: payload.tenantSlug,
        tenantName: payload.tenantName,
        locationId: user.locationId,
        isSuperAdmin: false,
      };
    }
  }

  // Check for super admin session
  token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
  payload = await decodeSession(token);

  if (payload && payload.isSuperAdmin) {
    // Debug logging for super admin lookup
    // console.log("Checking super admin session for ID:", payload.superAdminId);
    
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: payload.superAdminId },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (superAdmin) {
      return {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        isSuperAdmin: true,
      };
    } else {
      // console.log("Super admin not found in database for ID:", payload.superAdminId);
    }
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    redirect("/auth/admin-login");
  }
  return user;
}

// Role-based access control helpers
export const ROLES = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
};

/**
 * Check if user has any of the specified roles
 * @param {object} user - User object from getCurrentUser()
 * @param {string|string[]} requiredRoles - Single role or array of roles
 * @returns {boolean}
 */
export function hasRole(user, requiredRoles) {
  if (!user || !user.role) return false;
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return rolesArray.includes(user.role);
}

/**
 * Require specific roles or return error response
 * @param {object} user - User object from getCurrentUser()
 * @param {string|string[]} requiredRoles - Single role or array of roles
 * @returns {null|Response} Returns null if authorized, or error Response if not
 */
export function requireRole(user, requiredRoles) {
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(user, requiredRoles)) {
    return Response.json(
      { error: "Access denied: insufficient permissions" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get role-based permissions for an operation
 */
export function getRolePermissions(role) {
  const permissions = {
    [ROLES.OWNER]: [
      "create_products",
      "edit_products",
      "delete_products",
      "create_purchase_orders",
      "receive_purchase_orders",
      "create_suppliers",
      "adjust_stock",
      "transfer_stock",
      "view_reports",
      "export_reports",
    ],
    [ROLES.MANAGER]: [
      "create_products",
      "edit_products",
      "create_purchase_orders",
      "receive_purchase_orders",
      "create_suppliers",
      "adjust_stock",
      "transfer_stock",
      "view_reports",
      "export_reports",
    ],
    [ROLES.STAFF]: [
      "adjust_stock",
      "view_reports",
    ],
  };

  return permissions[role] || [];
}

/**
 * Get location filter for Prisma queries based on user role
 * @param {object} user - User object from requireUser()
 * @returns {object} Prisma where clause fragment
 */
export function getLocationFilter(user) {
  if (!user) return {};
  
  // Owners can see everything
  if (user.role === ROLES.OWNER) {
    return {};
  }
  
  // Managers and Staff are limited to their assigned location
  if (user.role === ROLES.MANAGER || user.role === ROLES.STAFF) {
    if (user.locationId) {
      return { locationId: user.locationId };
    }
    // If a non-owner has no location assigned, they should see NOTHING 
    // to prevent accidental data leakage across the tenant.
    return { locationId: "UNASSIGNED_RESTRICTED" };
  }
  
  return {};
}

