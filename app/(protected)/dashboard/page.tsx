/**
 * app/(protected)/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * LAYER 2 AUTH: SERVER COMPONENT — The Real Security Gate
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Even though middleware already checked auth, we call auth() here too.
 * This is NOT redundant. It's required because of CVE-2025-29927:
 * middleware can be bypassed by crafting a special header.
 *
 * This page is inside (protected)/ — a route group.
 * Route groups (in parentheses) don't affect the URL path.
 * They're used to share layouts or apply patterns to a set of routes.
 * All routes in (protected)/ require auth, enforced by both:
 *   1. middleware.ts (fast pre-filter)
 *   2. auth() check here (the real guard)
 */

import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ServerActionDemo from "@/components/ServerActionDemo";
import RbacDemo from "@/components/RbacDemo";

export default async function DashboardPage() {
  // ── THE LAYER 2 AUTH CHECK ─────────────────────────────────────────────
  // auth() decrypts the JWT from the cookie.
  // If no valid cookie → session is null → redirect.
  // This runs in Node.js. Can access DB, bcrypt, anything.
  const session = await auth();
  if (!session) {
    // redirect() throws internally — execution stops here
    redirect("/login?callbackUrl=/dashboard");
  }

  // Read headers stamped by middleware (shows the middleware → page handoff)
  const reqHeaders = await headers();
  const roleFromMiddleware = reqHeaders.get("x-user-role") ?? "(not set — middleware bypassed?)";
  const idFromMiddleware   = reqHeaders.get("x-user-id")   ?? "(not set)";

  // What the full session object looks like
  const sessionJson = JSON.stringify(session, null, 2);

  return (
    <div className="page fade-up">
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span className="layer-badge layer-node">Layer 2 — Server Component</span>
          <span className={`role-badge role-${session.user.role}`}>{session.user.role}</span>
        </div>
        <h1 style={{ marginBottom: "8px" }}>Dashboard</h1>
        <p style={{ color: "var(--muted)" }}>
          Welcome, <strong style={{ color: "var(--text)" }}>{session.user.name}</strong>.
          This page required both middleware (Layer 1) and auth() (Layer 2) to pass.
        </p>
      </div>

      {/* ── CVE-2025-29927 PROOF PANEL ───────────────────────────────── */}
      <div className="terminal" style={{ marginBottom: "24px" }}>
        <div><span className="cmt">{"// DEFENSE IN DEPTH — both layers ran for this request"}</span></div>
        <div style={{ marginTop: "8px" }}>
          <span className="lbl">Layer 1 (middleware) x-user-role:  </span>
          <span className="ok">{roleFromMiddleware}</span>
          <span className="cmt" style={{ marginLeft: "12px" }}>← stamped by middleware.ts at Edge</span>
        </div>
        <div>
          <span className="lbl">Layer 1 (middleware) x-user-id:    </span>
          <span className="ok">{idFromMiddleware}</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="lbl">Layer 2 (server) session.user.id:  </span>
          <span className="ok">{session.user.id}</span>
          <span className="cmt" style={{ marginLeft: "12px" }}>← from JWT in cookie — independent of middleware</span>
        </div>
        <div>
          <span className="lbl">Layer 2 (server) session.user.role:</span>
          <span className="ok"> {session.user.role}</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="cmt">{"// CVE-2025-29927: If middleware is bypassed, Layer 1 headers won't match"}</span>
        </div>
        <div>
          <span className="cmt">{"// Layer 2 (auth() in RSC) still works — it reads the cookie directly"}</span>
        </div>
        <div>
          <span className="cmt">{"// This is why auth() in your page is required, not optional"}</span>
        </div>
      </div>

      {/* ── FULL SESSION OBJECT ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <p className="section-label">Full session object (from auth())</p>
        <pre style={{ fontSize: "11px" }}>{sessionJson}</pre>
        <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--muted)" }}>
          This is what every Server Component, Server Action, and Route Handler
          sees when it calls <code>const session = await auth()</code>.
          The role and id were embedded in the JWT by the jwt() callback in auth.ts.
        </div>
      </div>

      {/* ── SERVER ACTION DEMO ─────────────────────────────────────────── */}
      <ServerActionDemo userId={session.user.id} userRole={session.user.role} />

      {/* ── RBAC DEMO ──────────────────────────────────────────────────── */}
      <RbacDemo role={session.user.role} />

      {/* ── SIGN OUT ───────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: "24px" }}>
        <p className="section-label">Sign Out</p>
        <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "16px", lineHeight: 1.7 }}>
          Signing out clears the JWT cookie. The middleware will no longer find a valid session.
          With JWT strategy, there's no DB record to delete — just clearing the cookie is enough.
        </p>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button type="submit" className="btn btn-danger">
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}