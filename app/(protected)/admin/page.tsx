/**
 * app/(protected)/admin/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * RBAC — Role-Based Access Control in a Server Component
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This page requires role === "admin".
 * Middleware handles the first check (redirects non-admins to /dashboard).
 * But we check AGAIN here — because middleware can be bypassed.
 *
 * WHAT RBAC LOOKS LIKE IN PRACTICE:
 *   1. Role stored in JWT (no DB needed per-request)
 *   2. Middleware checks role → redirects wrong roles away
 *   3. Server Component checks role → independent security gate
 *   4. Server Actions check role → before any mutation happens
 *
 * HORIZONTAL vs VERTICAL PRIVILEGE ESCALATION:
 *   Vertical: User accessing admin routes (role-based — what we demo here)
 *   Horizontal: User A accessing User B's data with same role
 *               (ownership check: `where: { id: postId, userId: session.user.id }`)
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  // Layer 2 check — always re-validate
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }

  // RBAC check — even if middleware passed, verify again here
  if (session.user.role !== "admin") {
    redirect("/dashboard?error=insufficient_role");
  }

  return (
    <div className="page fade-up">
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <span className="layer-badge layer-node">Layer 2 — RBAC</span>
          <span className="role-badge role-admin">admin only</span>
        </div>
        <h1 style={{ marginBottom: "8px" }}>Admin Panel</h1>
        <p style={{ color: "var(--muted)" }}>
          Only role=admin can see this. Both middleware AND this page verified your role independently.
        </p>
      </div>

      {/* Show how both checks happened */}
      <div className="terminal" style={{ marginBottom: "24px" }}>
        <div><span className="cmt">{"// TWO INDEPENDENT RBAC CHECKS FOR THIS PAGE:"}</span></div>
        <div style={{ marginTop: "8px" }}>
          <span className="lbl">Check 1 — middleware.ts (Edge): </span>
          <span className="ok">PASSED ✓</span>
        </div>
        <div style={{ marginLeft: "28px", fontSize: "10px" }}>
          <span className="cmt">{"// if (req.auth.user.role !== 'admin') redirect('/dashboard')"}</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="lbl">Check 2 — admin/page.tsx (Node.js): </span>
          <span className="ok">PASSED ✓</span>
        </div>
        <div style={{ marginLeft: "28px", fontSize: "10px" }}>
          <span className="cmt">{"// if (session.user.role !== 'admin') redirect('/dashboard')"}</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="lbl">session.user.id:   </span><span className="val">{session.user.id}</span>
        </div>
        <div>
          <span className="lbl">session.user.role: </span><span className="val">{session.user.role}</span>
        </div>
        <div>
          <span className="lbl">session.user.email:</span><span className="val"> {session.user.email}</span>
        </div>
      </div>

      {/* RBAC pattern explanation */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3 style={{ marginBottom: "16px" }}>The 3-Place RBAC Pattern</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            {
              place: "1. Middleware",
              file: "middleware.ts",
              cls: "layer-edge",
              code: `if (pathname.startsWith('/admin') && role !== 'admin')
  redirect('/dashboard?error=insufficient_role')`,
              note: "Fast pre-filter. Blocks most unauthorized traffic at the Edge.",
            },
            {
              place: "2. Server Component",
              file: "app/(protected)/admin/page.tsx",
              cls: "layer-node",
              code: `const session = await auth();
if (session.user.role !== 'admin') redirect('/dashboard');
// Now render admin content`,
              note: "The real security gate. Runs even if middleware was bypassed.",
            },
            {
              place: "3. Server Action",
              file: "app/actions.ts",
              cls: "layer-action",
              code: `'use server';
export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session) throw new Error('401 Unauthorized');
  if (session.user.role !== 'admin') throw new Error('403 Forbidden');
  await db.user.delete({ where: { id: userId } });
}`,
              note: "Always re-validate before mutations. Server Actions are directly callable via fetch — the UI can be bypassed.",
            },
          ].map(item => (
            <div key={item.place} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "16px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{item.place}</span>
                <span className={`layer-badge ${item.cls}`}>{item.file}</span>
              </div>
              <pre style={{ marginBottom: "8px", fontSize: "11px" }}>{item.code}</pre>
              <p style={{ fontSize: "11px", color: "var(--muted)" }}>{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What NOT to do */}
      <div className="alert alert-error">
        <span>❌</span>
        <div>
          <strong>Never do this:</strong>
          <pre style={{ marginTop: "8px", fontSize: "11px", background: "transparent", border: "none", padding: 0 }}>
{`// WRONG — client-side role check used as security
'use client';
const { data: session } = useSession();
if (session?.user?.role !== 'admin') return null; // ← This is UI only!
return <button onClick={callAdminApiDirectly}>Delete All</button>;
// An attacker can call callAdminApiDirectly() directly from the console.`}
          </pre>
          <p style={{ marginTop: "8px", fontSize: "11px" }}>
            Client-side role checks are <strong>UI hints only</strong>. Always enforce roles in Server Actions and Route Handlers.
          </p>
        </div>
      </div>
    </div>
  );
}