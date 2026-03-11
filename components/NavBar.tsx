/**
 * components/NavBar.tsx
 * Server Component — receives session as prop from layout.
 * No useSession() hook needed. No "use client" needed.
 * This is the correct pattern for RSC navigation.
 */

import { signOut } from "@/auth";
import { Session } from "next-auth";

interface Props {
  session: Session | null;
}

export default function NavBar({ session }: Props) {
  return (
    <nav>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
        <a href="/" className="logo">AuthLab</a>

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <a href="/" style={{ color: "var(--muted)", fontSize: "12px" }}>Architecture</a>
          {session ? (
            <>
              <a href="/dashboard" style={{ color: "var(--muted)", fontSize: "12px" }}>Dashboard</a>
              {session.user.role === "admin" && (
                <a href="/admin" style={{ color: "var(--admin)", fontSize: "12px" }}>Admin</a>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`role-badge role-${session.user.role}`} style={{ fontSize: "9px" }}>
                  {session.user.role}
                </span>
                <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                  {session.user.name}
                </span>
                <form action={async () => {
                  "use server";
                  const { signOut: so } = await import("@/auth");
                  await so({ redirectTo: "/" });
                }}>
                  <button type="submit" className="btn btn-sm btn-outline" style={{ padding: "4px 12px" }}>
                    Sign out
                  </button>
                </form>
              </div>
            </>
          ) : (
            <a href="/login" className="btn btn-primary btn-sm">
              Sign in →
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}