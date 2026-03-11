/**
 * app/page.tsx — AuthLab Home
 * Public page — no auth required. Shows the architecture map.
 */
import { auth } from "@/auth";
import Link from "next/link";

const AUTH_LAYERS = [
  {
    n: 1,
    cls: "layer-edge",
    name: "Middleware (Edge)",
    file: "middleware.ts",
    runtime: "V8 isolate — <1ms",
    when: "Every request, before page renders",
    canDo: ["Verify JWT (jose)", "Redirect to /login", "Check role from token", "Set x-user-role header"],
    cannotDo: ["Run bcrypt", "Call Prisma/DB", "Access file system"],
    danger: null,
    code: `// middleware.ts — runs at Vercel Edge
export default auth(async (req) => {
  if (!req.auth) redirect('/login');
  if (req.nextUrl.pathname.startsWith('/admin'))
    if (req.auth.user.role !== 'admin') redirect('/403');
});`,
  },
  {
    n: 2,
    cls: "layer-node",
    name: "Server Component (Node.js)",
    file: "app/**/page.tsx",
    runtime: "Node.js — full access",
    when: "Every page render (SSR or ISR)",
    canDo: ["Full auth() session", "DB queries (Prisma)", "bcrypt", "ALWAYS re-check even if middleware ran"],
    cannotDo: ["useState / useEffect", "Browser APIs"],
    danger: "CVE-2025-29927: Middleware can be bypassed. This check is the real guard.",
    code: `// app/dashboard/page.tsx — Node.js RSC
export default async function DashboardPage() {
  const session = await auth();     // ← REAL auth check
  if (!session) redirect('/login'); // ← even if middleware ran

  // Now safe to fetch user-specific data
  const data = await db.posts.findMany({
    where: { userId: session.user.id }
  });
}`,
  },
  {
    n: 3,
    cls: "layer-action",
    name: "Server Action",
    file: "app/**/actions.ts",
    runtime: "Node.js — full access",
    when: "On every form submit or mutation",
    canDo: ["Full auth() session", "DB writes", "ALWAYS re-validate (rule #1)"],
    cannotDo: ["Trust client-passed user IDs", "Skip auth because UI is 'protected'"],
    danger: "Server Actions are directly callable via fetch(). An attacker can skip your UI entirely.",
    code: `// app/actions.ts — Server Action
'use server';

export async function deletePost(postId: string) {
  const session = await auth();          // ← ALWAYS re-validate
  if (!session) throw new Error('401');  // ← never trust client state

  // Verify the user OWNS this post (horizontal privilege escalation)
  const post = await db.post.findUnique({ where: { id: postId } });
  if (post?.userId !== session.user.id) throw new Error('403');

  await db.post.delete({ where: { id: postId } });
  revalidatePath('/dashboard');
}`,
  },
  {
    n: 4,
    cls: "layer-client",
    name: "Client Component",
    file: "components/**/*.tsx",
    runtime: "Browser",
    when: "UI state and interactions",
    canDo: ["useSession() hook", "Show/hide UI elements by role", "Handle sign-in/out buttons"],
    cannotDo: ["Be trusted for security decisions", "Replace server-side auth"],
    danger: "Client-side role checks are UI hints only. Anyone can modify client code.",
    code: `// components/AdminButton.tsx — 'use client'
'use client';
import { useSession } from 'next-auth/react';

export function AdminButton() {
  const { data: session } = useSession();

  // This hides the button — it does NOT secure the action.
  // The Server Action still validates the role independently.
  if (session?.user?.role !== 'admin') return null;

  return <button onClick={handleAdminAction}>Admin Only</button>;
}`,
  },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="page fade-up">
      {/* Hero */}
      <div style={{ paddingBottom: "40px", borderBottom: "1px solid var(--border)", marginBottom: "40px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          {session ? (
            <span className="alert alert-success" style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px" }}>
              ✓ Logged in as {session.user?.name} · <span className={`role-${session.user?.role}`}>{session.user?.role}</span>
            </span>
          ) : (
            <span className="alert alert-info" style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px" }}>
              ○ Not logged in — <a href="/login" style={{ color: "var(--edge)", textDecoration: "underline" }}>sign in to see protected pages</a>
            </span>
          )}
        </div>
        <h1 style={{ marginBottom: "12px" }}>Phase 3:<br />Authentication Architecture</h1>
        <p style={{ color: "var(--muted)", maxWidth: "600px", lineHeight: 1.8, fontSize: "14px" }}>
          Auth isn't just "add NextAuth". It's a 4-layer architecture where each layer
          has a different role, runtime, and level of trust. Get one layer wrong and you
          either leak data or break usability.
        </p>
        <div className="alert alert-warn" style={{ marginTop: "20px", maxWidth: "640px" }}>
          <span>⚠️</span>
          <div>
            <strong>CVE-2025-29927</strong> — Patched in Next.js 15.2.3+. An attacker could bypass middleware
            entirely using a spoofed header. The lesson: <strong>middleware is a pre-filter, not a security gate.</strong>{" "}
            Always re-validate auth in Server Components and Server Actions.
          </div>
        </div>
      </div>

      {/* Test accounts */}
      <div className="card" style={{ marginBottom: "40px" }}>
        <p className="section-label">Demo Accounts (try them all)</p>
        <div className="grid-3" style={{ gap: "12px" }}>
          {[
            { email: "alice@example.com", pass: "password123", role: "user", name: "Alice Chen", access: "/dashboard, /settings" },
            { email: "bob@example.com", pass: "password456", role: "editor", name: "Bob Martinez", access: "/dashboard, /settings" },
            { email: "admin@example.com", pass: "adminpass", role: "admin", name: "Admin User", access: "/dashboard, /settings, /admin" },
          ].map(acc => (
            <div key={acc.email} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px" }}>{acc.name}</span>
                <span className={`role-badge role-${acc.role}`}>{acc.role}</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 2 }}>
                <div><span style={{ color: "var(--dim)" }}>email: </span>{acc.email}</div>
                <div><span style={{ color: "var(--dim)" }}>pass:  </span>{acc.pass}</div>
                <div><span style={{ color: "var(--dim)" }}>can see: </span><span style={{ color: "var(--text)" }}>{acc.access}</span></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
          <Link href="/login" className="btn btn-primary">→ Login Page</Link>
          <Link href="/dashboard" className="btn btn-outline">→ Dashboard (protected)</Link>
          <Link href="/admin" className="btn btn-outline" style={{ color: "var(--admin)", borderColor: "var(--admin)" }}>→ Admin (admin only)</Link>
        </div>
      </div>

      {/* Architecture: 4 layers */}
      <h2 style={{ marginBottom: "8px" }}>The 4-Layer Auth Architecture</h2>
      <p style={{ color: "var(--muted)", marginBottom: "28px", lineHeight: 1.7 }}>
        Every Next.js app has auth running in four separate places simultaneously.
        Each layer has a different runtime, trust level, and responsibility.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {AUTH_LAYERS.map(layer => (
          <div key={layer.n} className="card">
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--surface2)", flexShrink: 0,
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px",
              }}>
                {layer.n}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "4px" }}>
                  <h3 style={{ fontSize: "16px" }}>{layer.name}</h3>
                  <span className={`layer-badge ${layer.cls}`}>{layer.runtime}</span>
                  <code style={{ fontSize: "11px", color: "var(--muted)", background: "var(--surface2)", padding: "2px 8px", borderRadius: "4px" }}>
                    {layer.file}
                  </code>
                </div>
                <p style={{ color: "var(--muted)", fontSize: "12px" }}>Runs: {layer.when}</p>
              </div>
            </div>

            {layer.danger && (
              <div className="alert alert-error" style={{ marginBottom: "16px", fontSize: "11px" }}>
                <span>⚠️</span><div>{layer.danger}</div>
              </div>
            )}

            <div className="grid-2" style={{ marginBottom: "16px" }}>
              <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "6px", padding: "12px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", marginBottom: "8px" }}>✅ Can Do</p>
                {layer.canDo.map(item => (
                  <div key={item} style={{ fontSize: "11px", color: "#6ee7b7", marginBottom: "4px" }}>→ {item}</div>
                ))}
              </div>
              <div style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: "6px", padding: "12px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", marginBottom: "8px" }}>❌ Cannot Do</p>
                {layer.cannotDo.map(item => (
                  <div key={item} style={{ fontSize: "11px", color: "#fda4af", marginBottom: "4px" }}>→ {item}</div>
                ))}
              </div>
            </div>

            <pre style={{ fontSize: "11px" }}>{layer.code}</pre>
          </div>
        ))}
      </div>

      {/* JWT vs Session decision guide */}
      <div style={{ marginTop: "40px" }} className="card">
        <h3 style={{ marginBottom: "16px" }}>JWT vs Database Sessions — The Decision Guide</h3>
        <div className="grid-2">
          <div>
            <div style={{ fontWeight: 700, color: "var(--edge)", marginBottom: "10px", fontSize: "13px" }}>🔑 JWT Strategy (default)</div>
            <div style={{ fontSize: "12px", lineHeight: 2, color: "var(--muted)" }}>
              {["Works on Edge middleware (no DB needed)", "Scales to millions — zero DB lookups", "Stateless — no session table needed", "4KB cookie limit on session data", "Cannot revoke before expiry (security risk)", "Use for: blogs, SaaS, public apps"].map((item, i) => (
                <div key={i} style={{ color: i < 3 ? "#6ee7b7" : i < 5 ? "#fda4af" : "var(--muted)" }}>{i < 3 ? "✓" : i < 5 ? "✗" : "→"} {item}</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "var(--node)", marginBottom: "10px", fontSize: "13px" }}>🗄️ Database Strategy</div>
            <div style={{ fontSize: "12px", lineHeight: 2, color: "var(--muted)" }}>
              {["Immediate revocation (sign out everywhere)", "Detailed audit log of sessions", "Session data stored server-side", "DB lookup on every request (~30-100ms)", "Incompatible with Edge middleware", "Use for: banking, enterprise, admin panels"].map((item, i) => (
                <div key={i} style={{ color: i < 3 ? "#6ee7b7" : i < 5 ? "#fda4af" : "var(--muted)" }}>{i < 3 ? "✓" : i < 5 ? "✗" : "→"} {item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}