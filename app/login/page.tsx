/**
 * app/login/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: Sign-in with credentials + Server Action
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Two approaches to triggering signIn():
 *
 * Approach A — Server Action (recommended for credentials):
 *   Form submits → Server Action calls signIn('credentials', {...})
 *   → Auth.js runs authorize() → sets cookie → redirect
 *   ✅ No client-side JS needed for the form submission
 *   ✅ CSRF protected automatically
 *
 * Approach B — Client Component with useSession (shown for OAuth):
 *   Button click → signIn('github') → redirect to GitHub → callback
 *   → Auth.js sets cookie → redirect to callbackUrl
 */

import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  // If already logged in, redirect away
  const session = await auth();
  const { error, callbackUrl } = await searchParams;
  if (session) redirect(callbackUrl ?? "/dashboard");

  return (
    <div className="page" style={{ maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <span className="layer-badge layer-node">Server Action</span>
          <span className="layer-badge layer-edge">Middleware protected</span>
        </div>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Sign in to AuthLab</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Try any of the three demo accounts from the home page.
        </p>
      </div>

      {/* Error from Auth.js (wrong password, etc.) */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
          <span>⚠️</span>
          <div>
            {error === "CredentialsSignin"
              ? "Invalid email or password."
              : error === "OAuthSignin"
              ? "OAuth sign-in failed. Check GITHUB_ID and GITHUB_SECRET."
              : `Auth error: ${error}`}
          </div>
        </div>
      )}

      {/* Redirect message */}
      {callbackUrl && (
        <div className="alert alert-info" style={{ marginBottom: "20px" }}>
          <span>🔒</span>
          <div>You tried to access a protected page. Please sign in to continue.</div>
        </div>
      )}

      {/* Main login form — Client Component for interactivity */}
      <LoginForm callbackUrl={callbackUrl} />

      {/* Architecture note */}
      <div className="terminal" style={{ marginTop: "24px" }}>
        <div><span className="cmt">{"// What happens when you click Sign In:"}</span></div>
        <div><span className="lbl">1. </span><span className="val">Form submits to Server Action (no JS fetch needed)</span></div>
        <div><span className="lbl">2. </span><span className="val">signIn('credentials', {"{email, password, redirect: false}"})</span></div>
        <div><span className="lbl">3. </span><span className="val">auth.ts authorize() called → findUserByEmail()</span></div>
        <div><span className="lbl">4. </span><span className="val">bcrypt.compare(password, user.passwordHash)</span></div>
        <div><span className="lbl">5. </span><span className="val">jwt() callback → token.id = user.id, token.role = user.role</span></div>
        <div><span className="lbl">6. </span><span className="val">Auth.js sets __Secure-authjs.session-token cookie (encrypted JWT)</span></div>
        <div><span className="lbl">7. </span><span className="val">Redirect to /dashboard (or callbackUrl)</span></div>
        <div style={{ marginTop: "8px" }}><span className="cmt">{"// The cookie is HttpOnly — JS cannot read it (XSS protection)"}</span></div>
        <div><span className="cmt">{"// The cookie is Secure — only sent over HTTPS in production"}</span></div>
        <div><span className="cmt">{"// The cookie is SameSite=Lax — CSRF protection"}</span></div>
      </div>
    </div>
  );
}