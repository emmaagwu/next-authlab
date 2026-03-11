/**
 * auth.ts  ← ROOT OF PROJECT (not inside app/)
 * ─────────────────────────────────────────────────────────────────────────
 * THE MOST IMPORTANT ARCHITECTURAL DECISION IN AUTH.JS v5
 * ─────────────────────────────────────────────────────────────────────────
 *
 * In Auth.js v5, you configure auth ONCE in this root file.
 * Then you import { auth, signIn, signOut } from here — everywhere.
 *
 * WHY AT THE ROOT?
 * The exported `auth` function needs to work in ALL of these contexts:
 *   - Middleware (Edge runtime — lightweight JWT verify only)
 *   - Server Components (Node.js — can call DB)
 *   - Server Actions (Node.js — can call DB)
 *   - Route Handlers (Node.js — can call DB)
 *
 * THE SPLIT CONFIG PATTERN (advanced — for Edge middleware):
 * If your middleware needs to run on the Edge but your credentials
 * provider needs bcrypt (Node.js only), you need two configs:
 *
 *   auth.config.ts  — Edge-safe config (no bcrypt, no DB adapter)
 *                     Used by middleware for JWT verification only
 *   auth.ts         — Full config with credentials + DB adapter
 *                     Used by Server Components, Actions, Route Handlers
 *
 * We implement both patterns here. The inline comments explain every
 * decision.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * THE JWT vs DATABASE SESSION DECISION (critical architecture choice):
 *
 * JWT strategy (default):
 *   + Works on Edge middleware (no DB needed to verify)
 *   + Scales infinitely — no DB lookup per request
 *   + Zero infrastructure needed (just a secret)
 *   - Cannot be immediately invalidated (user stays "logged in" until expiry)
 *   - 4KB cookie size limit constrains payload
 *   ✓ USE WHEN: public app, stateless, no "sign out everywhere" needed
 *
 * Database strategy:
 *   + Can be immediately invalidated (sign out everywhere works)
 *   + No session data in cookie (just a session ID)
 *   - Requires DB lookup on EVERY request
 *   - Incompatible with Edge middleware (needs Node.js for DB)
 *   - Connection pooling required (see Phase 4)
 *   ✓ USE WHEN: banking, enterprise, sensitive data, revocation needed
 * ─────────────────────────────────────────────────────────────────────────
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { findUserByEmail } from "@/lib/users";
import { UserRole } from "@/types/next-auth";

// bcryptjs works in Node.js. It does NOT work on Edge runtime.
// This is why the split config pattern exists — keep bcrypt OUT of middleware.
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── CUSTOM PAGES ─────────────────────────────────────────────────────────
  // By default Auth.js shows its own /auth/signin page.
  // Setting this means unauthenticated users get sent to OUR /login page.
  pages: {
    signIn: "/login",
    error: "/login", // Auth errors go here too (wrong password, etc.)
  },

  // ── SESSION STRATEGY ─────────────────────────────────────────────────────
  // "jwt" = encode user data in a signed, encrypted cookie
  // No database needed to verify. Perfect for Edge middleware.
  // Switch to "database" if you need immediate session revocation.
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },

  // ── PROVIDERS ────────────────────────────────────────────────────────────
  providers: [
    // ── CREDENTIALS PROVIDER ───────────────────────────────────────────────
    // Handle email + password login.
    // authorize() runs in Node.js (not Edge) — bcrypt is fine here.
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // STEP 1: Validate inputs (never trust client data)
        if (!credentials?.email || !credentials?.password) {
          return null; // returning null = "invalid credentials" → redirect to /login?error=CredentialsSignin
        }

        // STEP 2: Find user in DB
        const user = await findUserByEmail(credentials.email as string);
        if (!user) {
          // SECURITY: Same error whether email doesn't exist OR password is wrong.
          // Don't tell attackers which emails are registered.
          return null;
        }

        // STEP 3: Compare password with bcrypt hash
        // bcrypt.compare() is intentionally slow (CPU-bound) — this is the brute-force protection
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // STEP 4: Return the user object — this becomes `user` in the jwt() callback
        // IMPORTANT: Never return the passwordHash here.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),

    // ── GITHUB OAUTH PROVIDER ──────────────────────────────────────────────
    // In production: set GITHUB_ID and GITHUB_SECRET in .env.local
    // GitHub redirects to /api/auth/callback/github after OAuth flow
    // We give GitHub users "user" role by default.
    GitHub({
      clientId: process.env.GITHUB_ID ?? "demo",
      clientSecret: process.env.GITHUB_SECRET ?? "demo",
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email ?? `${profile.login}@github.local`,
          image: profile.avatar_url,
          role: "user" as UserRole, // GitHub users get default role
        };
      },
    }),
  ],

  // ── CALLBACKS ────────────────────────────────────────────────────────────
  // Callbacks are how you customize the JWT payload and session object.
  // They run in this order: authorize() → jwt() → session()
  callbacks: {
    // ── JWT CALLBACK ───────────────────────────────────────────────────────
    // Fires when a JWT is created (sign in) or refreshed.
    // This is where you PERSIST custom data into the token.
    //
    // Execution order:
    //   1. Sign in → jwt({ user, token }) → user has id + role from authorize()
    //   2. Every request → jwt({ token }) → user is undefined (already in token)
    //
    // The token is stored ENCRYPTED in the session cookie.
    async jwt({ token, user }) {
      if (user) {
        // First sign in: user is populated from authorize() or OAuth profile
        // Copy custom fields into the token so they persist in the cookie
        token.id = user.id as string;
        token.role = ((user as any).role ?? "user") as UserRole;
      }
      return token; // ← stored encrypted in the __Secure-authjs.session-token cookie
    },

    // ── SESSION CALLBACK ───────────────────────────────────────────────────
    // Fires when session is read (every Server Component that calls auth()).
    // Takes the token (from cookie) and produces the Session object
    // that your app code sees.
    //
    // IMPORTANT: Only expose what the client actually needs.
    // Don't put sensitive fields here — session is readable by client code.
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session; // ← this is what `const session = await auth()` returns
    },
  },
});

/*
 * THE COMPLETE AUTH FLOW — for reference:
 *
 * USER VISITS /dashboard
 *   ↓
 * middleware.ts runs (Edge)
 *   → reads __Secure-authjs.session-token cookie
 *   → decrypts JWT using AUTH_SECRET
 *   → if no valid token → redirect to /login
 *   → if valid token → stamp x-user-role header → continue
 *   ↓
 * app/(protected)/dashboard/page.tsx renders (Node.js)
 *   → const session = await auth()
 *   → auth() decrypts the same JWT again (in Node.js this time)
 *   → session.user = { id, email, name, image, role }
 *   → render the page with user-specific data
 *
 * USER SUBMITS A FORM (Server Action)
 *   → const session = await auth()  ← RE-VALIDATE. Never trust client state.
 *   → if (!session) throw new Error("Unauthorized")
 *   → check session.user.role if needed
 *   → proceed with DB write
 */