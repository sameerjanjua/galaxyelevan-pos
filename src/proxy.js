import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-session-secret";
const KEY = new TextEncoder().encode(SESSION_SECRET);

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/admin-login",
  "/api/auth/login",
  "/api/auth/super-admin-login",
  "/api/auth/super-admin-logout",
  "/favicon.ico",
  "/api/health",
];

async function decodeSession(token) {
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

export async function proxy(request) {
  const url = request.nextUrl;
  const host = (request.headers.get("host") || "").split(":")[0];
  const pathname = url.pathname;

  // 1. Determine the environment and main domain
  const isLocalhost = host.includes("localhost") || host.includes("lvh.me");
  
  let subdomain = "";
  if (isLocalhost) {
    const parts = host.split(".");
    // Support: tenant.lvh.me, etc.
    if (parts.length > 2 && parts[parts.length-1] === "me" && parts[parts.length-2] === "lvh") {
       subdomain = parts[0];
    } 
    // Support: tenant.localhost, etc.
    else if (parts.length > 1 && parts[parts.length-1] === "localhost") {
       subdomain = parts[0];
    }
  } else {
    // Production domain handling
    const parts = host.split(".");
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  // Normalize subdomain
  if (subdomain === "www" || subdomain === "app") subdomain = "";


  // 2. Handle Public Paths & Excluded APIs
  // These should never be rewritten or redirected based on subdomain
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isExcludedApi = pathname.startsWith("/api/auth") || pathname.startsWith("/api/admin") || pathname.startsWith("/api/tenant");
  
  if (isPublicPath || isExcludedApi) {
    return NextResponse.next();
  }

  // 3. Handle Admin Domain (admin.pos-shop.com or /admin)
  if (subdomain === "admin" || pathname.startsWith("/admin")) {
    const adminSessionToken = request.cookies.get("admin_session")?.value;
    const payload = await decodeSession(adminSessionToken);

    if (!payload || !payload.isSuperAdmin) {
      if (pathname === "/auth/admin-login") return NextResponse.next();
      
      const loginUrl = new URL("/auth/admin-login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Protection: If already on /admin or it's an API, keep going
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // Redirect admin subdomain to /admin/ routes for consistency & hydration safety
    if (subdomain === "admin" && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL(`/admin${pathname}${url.search}`, request.url));
    }
    
    return NextResponse.next();
  }

  // 4. Handle Business Subdomains (tenant.pos-shop.com)
  if (subdomain && subdomain !== "") {
    const sessionToken = request.cookies.get("pos_session")?.value;
    const payload = await decodeSession(sessionToken);

    // SECURITY: If logged in, ensure slug matches subdomain
    if (payload) {
      if (payload.tenantSlug !== subdomain) {
        return NextResponse.json(
          { error: "Unauthorized - Tenant mismatch" },
          { status: 403 }
        );
      }
    } else {
      // Not logged in - redirect to login
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Protection: Prevent double-rewriting if pathname already starts with /subdomain/
    const tenantPrefix = `/${subdomain}`;
    if (pathname === tenantPrefix || pathname.startsWith(`${tenantPrefix}/`)) {
      return NextResponse.next();
    }

    // Internal Rewrite: tenant.domain.com/dashboard -> /tenant/dashboard
    const rewriteUrl = new URL(`${tenantPrefix}${pathname}${url.search}`, request.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  // 5. Handle Main Domain (pos-shop.com)
  if (!subdomain || subdomain === "") {
    // Root path on main domain: redirect to login
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/auth/login", request.url));
    }

    const adminSessionToken = request.cookies.get("admin_session")?.value;
    const adminPayload = await decodeSession(adminSessionToken);

    if (adminPayload && adminPayload.isSuperAdmin) {
      const targetAdminHost = isLocalhost ? "admin.lvh.me" : `admin.${host}`;
      
      // ONLY redirect if we are not already on the admin subdomain
      if (host !== targetAdminHost) {
        const adminUrl = new URL("/admin", request.url);
        adminUrl.hostname = targetAdminHost;
        return NextResponse.redirect(adminUrl);
      }
    }

    // Check for regular user session on main domain
    const sessionToken = request.cookies.get("pos_session")?.value;
    const payload = await decodeSession(sessionToken);

    if (payload && payload.tenantSlug) {
      // Redirect to their tenant subdomain
      const tenantUrl = new URL(pathname, request.url);
      if (isLocalhost) {
        tenantUrl.hostname = `${payload.tenantSlug}.lvh.me`;
      } else {
        tenantUrl.hostname = `${payload.tenantSlug}.${host}`;
      }
      return NextResponse.redirect(tenantUrl);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/auth|api/admin|api/tenant).*)"],
};
