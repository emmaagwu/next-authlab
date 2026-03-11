/**
 * middleware.ts  ← ROOT OF PROJECT
 * ─────────────────────────────────────────────────────────────────────────
 * LAYER 1 OF AUTH: EDGE MIDDLEWARE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Middleware runs at the Edge (V8 isolate) on EVERY request, before
 * any page or API route renders. It's the outermost security perimeter.
 *
 * WHAT MIDDLEWARE CAN DO:
 *  ✅ Read and verify JWTs (using jose — Edge compatible)
 *  ✅ Redirect unauthenticated users to /login
 *  ✅ Check roles from JWT payload (no DB needed)
 *  ✅ Set request headers to pass user data downstream
 *  ✅ Block access to entire route groups
 *
 * WHAT MIDDLEWARE CANNOT DO:
 *  ❌ Call bcrypt (Node.js only — use jose/HMAC in middleware)
 *  ❌ Use Prisma or any DB driver over TCP (needs Node.js runtime)
 *  ❌ Be the ONLY place you check auth (see CVE-2025-29927 below)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CVE-2025-29927 — CRITICAL SECURITY VULNERABILITY (CVSS 9.1)
 * ─────────────────────────────────────────────────────────────────────────
 * Disclosed: March 21, 2025
 * Affects: Next.js 11.1.4 through 15.2.2
 * Fixed in: Next.js 15.2.3+, 14.2.25+, 13.5.9+, 12.3.5+
 *
 * THE ATTACK:
 *   An attacker sends: x-middleware-subrequest: middleware:middleware:middleware
 *   Next.js interprets this as an internal subrequest and SKIPS middleware.
 *   Result: complete authentication bypass. Admin panel accessible with no login.
 *
 * THE LESSON (more important than the CVE itself):
 *   NEVER rely on middleware as your ONLY auth check.
 *   Middleware is a fast pre-filter, not a security gate.
 *   Always re-validate auth in your Server Components and Server Actions.
 *
 * DEFENSE IN DEPTH — The Three Auth Checks:
 *   1. Middleware (Edge)    → fast pre-filter, redirects obvious non-auth traffic
 *   2. Server Component     → `const session = await auth()` — the real check
 *   3. Server Action        → `const session = await auth()` — always re-validate
 * ─────────────────────────────────────────────────────────────────────────
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route configuration — define your protection rules here
const ROUTE_CONFIG = {
  // These routes require authentication (any role)
  protected: ["/dashboard", "/settings"],

  // These routes require the "admin" role specifically
  adminOnly: ["/admin"],

  // These routes redirect logged-in users away (no point visiting /login if already authed)
  authRoutes: ["/login", "/register"],

  // Public routes — accessible to everyone
  public: ["/", "/api/auth"],
};

// The `auth` export from Auth.js v5 can wrap middleware directly.
// It handles JWT decryption and populates `request.auth` with the session.
export default auth(async function middleware(request) {
  const { nextUrl, auth: session } = request as NextRequest & { auth: any };
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;

  // ── ADMIN ROUTES — requires "admin" role ─────────────────────────────────
  if (ROUTE_CONFIG.adminOnly.some(route => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      // Not logged in → go to login with return URL
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "admin") {
      // Logged in but wrong role → 403 page (or redirect to dashboard)
      return NextResponse.redirect(new URL("/dashboard?error=insufficient_role", nextUrl.origin));
    }
    // ✅ Admin user — allow through, stamp the role in a header for the page
    const response = NextResponse.next();
    response.headers.set("x-user-role", userRole);
    response.headers.set("x-user-id", session.user.id);
    return response;
  }

  // ── PROTECTED ROUTES — requires any authenticated user ──────────────────
  if (ROUTE_CONFIG.protected.some(route => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // ✅ Authenticated — stamp user info in headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-role", userRole ?? "user");
    response.headers.set("x-user-id", session.user.id);
    return response;
  }

  // ── AUTH ROUTES — redirect logged-in users away ──────────────────────────
  if (ROUTE_CONFIG.authRoutes.some(route => pathname.startsWith(route))) {
    if (isLoggedIn) {
      // Already logged in, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }
    return NextResponse.next();
  }

  // ── PUBLIC ROUTES — everyone gets through ────────────────────────────────
  return NextResponse.next();
});

// Configure which paths middleware runs on.
// IMPORTANT: exclude static assets and _next internals for performance.
// Middleware running on every .jpg would be wasteful and slow.
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

/*
 * MIDDLEWARE vs SERVER COMPONENT AUTH — The Decision Tree:
 *
 *           Request arrives
 *                ↓
 *         middleware.ts (Edge)
 *          ↓           ↓
 *       No JWT       Has JWT
 *          ↓           ↓
 *    → /login    Check route type
 *                 ↓          ↓
 *             /admin      /dashboard
 *              ↓               ↓
 *          role=admin?      any user?
 *              ↓               ↓
 *            ✅              ✅
 *              ↓               ↓
 *         Page renders     Page renders
 *              ↓               ↓
 *         auth() check    auth() check    ← ALWAYS do this too (CVE-2025-29927)
 *              ↓               ↓
 *           render           render
 */