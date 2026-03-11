/**
 * app/api/auth/[...nextauth]/route.ts
 * ─────────────────────────────────────────────────────────────────────────
 * THE AUTH.JS CATCH-ALL ROUTE HANDLER
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This single file handles ALL Auth.js HTTP endpoints:
 *   GET  /api/auth/signin            → sign-in page (or redirect to /login)
 *   POST /api/auth/signin/credentials → credentials sign-in
 *   GET  /api/auth/signin/github      → GitHub OAuth redirect
 *   GET  /api/auth/callback/github    → GitHub OAuth callback
 *   POST /api/auth/signout            → sign out + clear cookie
 *   GET  /api/auth/session            → current session (JSON)
 *   GET  /api/auth/csrf               → CSRF token
 *   GET  /api/auth/providers          → list of configured providers
 *
 * In Auth.js v4 you had to re-export authOptions here.
 * In v5 you just re-export { GET, POST } from handlers.
 * The configuration lives once in auth.ts at the project root.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { handlers } from "@/auth";
export const { GET, POST } = handlers

// That's it. One line. The handlers object from NextAuth() in auth.ts
// contains GET and POST methods that Auth.js uses for all its endpoints.