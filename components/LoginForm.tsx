"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Quick-fill buttons for demo
  const DEMO_ACCOUNTS = [
    { label: "user", email: "alice@example.com", pass: "password123" },
    { label: "editor", email: "bob@example.com", pass: "password456" },
    { label: "admin", email: "admin@example.com", pass: "adminpass" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      /**
       * signIn('credentials', ...) from 'next-auth/react'
       *
       * This is the CLIENT-SIDE call. It:
       *  1. POSTs to /api/auth/signin/credentials
       *  2. Auth.js calls our authorize() function
       *  3. Returns { ok, error, status, url }
       *
       * WHY redirect: false?
       * Default behaviour redirects the page immediately (no error handling).
       * With redirect: false, we get the result back and can show errors.
       */
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, // ← handle redirect ourselves so we can show errors
      });

      if (result?.error) {
        setError("Invalid email or password. Check the demo accounts on the home page.");
        return;
        console.log(result.error);
      }

      if (result?.ok) {
        // Success — redirect to callbackUrl or dashboard
        router.push(callbackUrl ?? "/dashboard");
        router.refresh(); // ← Update RSC tree with new session (Layer 4 cache bust)
      }
    });
  }

  return (
    <div className="card">
      {/* Demo quick-fill buttons */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
          Quick fill demo account
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.label}
              type="button"
              onClick={() => { setEmail(acc.email); setPassword(acc.pass); setError(null); }}
              className={`btn btn-sm role-badge role-${acc.label}`}
              style={{ border: "1px solid currentColor" }}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="alice@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password123"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>
            <span>⚠️</span><div>{error}</div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !email || !password}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {isPending ? (
            <><span className="pulse">●</span> Signing in...</>
          ) : (
            "Sign In →"
          )}
        </button>
      </form>

      {/* OAuth divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ color: "var(--muted)", fontSize: "11px" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      {/* GitHub OAuth */}
      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl: callbackUrl ?? "/dashboard" })}
        className="btn btn-outline"
        style={{ width: "100%", justifyContent: "center" }}
      >
        {/* GitHub icon */}
        <svg height="18" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Continue with GitHub
      </button>

      <p style={{ marginTop: "16px", fontSize: "11px", color: "var(--dim)", textAlign: "center" }}>
        GitHub OAuth requires GITHUB_ID + GITHUB_SECRET env vars
      </p>
    </div>
  );
}