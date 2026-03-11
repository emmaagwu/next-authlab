/**
 * components/ServerActionDemo.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * LAYER 3 AUTH: SERVER ACTIONS — always re-validate
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This component demonstrates the critical Server Action auth pattern.
 *
 * THE GOLDEN RULE:
 * Every Server Action MUST call auth() and verify the session.
 * Do NOT pass user IDs from the client. Do NOT trust URL params.
 * Get the user from the session on the server — always.
 *
 * WHY SERVER ACTIONS CAN BE CALLED DIRECTLY:
 * A Server Action is exposed as a POST endpoint at a predictable URL.
 * Your beautiful protected UI is irrelevant to an attacker — they
 * can call the action directly with fetch() or curl.
 */

"use client";

import { useState, useTransition } from "react";

interface Props {
  userId: string;
  userRole: string;
}

export default function ServerActionDemo({ userId, userRole }: Props) {
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  async function callAction(type: "valid" | "spoof" | "admin") {
    setResult(null);
    startTransition(async () => {
      const res = await fetch("/api/admin-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, spoofedUserId: "usr_admin_003" }),
      });
      const data = await res.json();
      setResult(data);
    });
  }

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <span className="layer-badge layer-action">Layer 3 — Server Action</span>
      </div>
      <h3 style={{ marginBottom: "8px" }}>Server Action Auth Re-validation</h3>
      <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "16px", lineHeight: 1.7 }}>
        Server Actions <strong>always</strong> call <code>auth()</code> internally — they never
        trust any data passed from the client. Click below to see the pattern in action.
      </p>

      <div className="grid-3" style={{ gap: "10px", marginBottom: "16px" }}>
        <button onClick={() => callAction("valid")} disabled={isPending} className="btn btn-outline btn-sm" style={{ flexDirection: "column", alignItems: "flex-start", height: "auto", padding: "12px" }}>
          <span style={{ fontWeight: 700 }}>✅ Valid Action</span>
          <span style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>Auth re-validated, allowed</span>
        </button>
        <button onClick={() => callAction("spoof")} disabled={isPending} className="btn btn-outline btn-sm" style={{ flexDirection: "column", alignItems: "flex-start", height: "auto", padding: "12px", color: "var(--warn)", borderColor: "var(--warn)" }}>
          <span style={{ fontWeight: 700 }}>⚠️ Spoof User ID</span>
          <span style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>Try to pass fake userId</span>
        </button>
        <button onClick={() => callAction("admin")} disabled={isPending} className="btn btn-outline btn-sm" style={{ flexDirection: "column", alignItems: "flex-start", height: "auto", padding: "12px", color: "var(--admin)", borderColor: "var(--admin)" }}>
          <span style={{ fontWeight: 700 }}>🚫 Try Admin Action</span>
          <span style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>Call admin API as {userRole}</span>
        </button>
      </div>

      {isPending && (
        <div style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>Running server action...</div>
      )}

      {result && !isPending && (
        <div className="terminal">
          <div><span className="cmt">{"// Server Action response:"}</span></div>
          <div style={{ marginTop: "8px" }}>
            <span className="lbl">result: </span>
            <span className={result.allowed ? "ok" : "err"}>{result.allowed ? "✅ ALLOWED" : "❌ BLOCKED"}</span>
          </div>
          <div><span className="lbl">message: </span><span className="val">{result.message}</span></div>
          {result.sessionUser && (
            <div><span className="lbl">session.user.id: </span><span className="ok">{result.sessionUser}</span></div>
          )}
          {result.spoofedId && (
            <div><span className="lbl">client sent userId: </span><span className="err">{result.spoofedId} ← IGNORED</span></div>
          )}
          {result.code && (
            <div style={{ marginTop: "8px" }}>
              <span className="cmt">{"// The code that ran in the Server Action:"}</span>
              <pre style={{ background: "transparent", border: "none", padding: "0", marginTop: "4px", fontSize: "10px", color: "#4a9" }}>
                {result.code}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* The pattern explanation */}
      <pre style={{ marginTop: "16px", fontSize: "10px" }}>
{`// CORRECT Server Action pattern:
'use server';

export async function updatePost(postId: string, data: unknown) {
  // 1. ALWAYS get user from server session — never from client params
  const session = await auth();
  if (!session) throw new Error('401 — not authenticated');

  // 2. RBAC: check role if needed
  // if (session.user.role !== 'admin') throw new Error('403');

  // 3. Ownership check (horizontal privilege escalation prevention)
  const post = await db.post.findUnique({ where: { id: postId } });
  if (post?.authorId !== session.user.id) throw new Error('403 — not your post');

  // 4. Validate the data (zod schema)
  const validated = PostSchema.parse(data);

  // 5. Finally safe to write
  return db.post.update({ where: { id: postId }, data: validated });
}`}
      </pre>
    </div>
  );
}