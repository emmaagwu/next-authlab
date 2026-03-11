/**
 * components/RbacDemo.tsx
 * Shows the difference between client-side role hints (UI) vs server-side RBAC (security).
 * This is a Server Component — it receives role as a prop from the authenticated page.
 */

import Link from "next/link";
import { UserRole } from "@/types/next-auth";

const FEATURES = [
  { name: "View Dashboard",    minRole: "user",   icon: "📊" },
  { name: "Edit Posts",        minRole: "editor", icon: "✏️" },
  { name: "Publish Posts",     minRole: "editor", icon: "📤" },
  { name: "Manage Users",      minRole: "admin",  icon: "👥" },
  { name: "View Analytics",    minRole: "admin",  icon: "📈" },
  { name: "Delete Any Post",   minRole: "admin",  icon: "🗑️" },
  { name: "System Settings",   minRole: "admin",  icon: "⚙️" },
];

const ROLE_HIERARCHY: Record<UserRole, number> = { user: 0, editor: 1, admin: 2 };

function canAccess(userRole: UserRole, minRole: string): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole as UserRole];
}

export default function RbacDemo({ role }: { role: UserRole }) {
  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px" }}>RBAC Feature Matrix</h3>
        <span className={`role-badge role-${role}`}>your role: {role}</span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "16px" }}>
        These ✅/❌ icons are <strong>UI hints</strong> — they improve UX by hiding irrelevant features.
        The actual enforcement happens in <strong>Server Actions and Route Handlers</strong> (Layer 3).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
        {FEATURES.map(feature => {
          const allowed = canAccess(role, feature.minRole);
          return (
            <div key={feature.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: "6px",
              background: allowed ? "rgba(16,185,129,0.04)" : "rgba(244,63,94,0.04)",
              border: `1px solid ${allowed ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span>{feature.icon}</span>
                <span style={{ fontSize: "13px", color: allowed ? "var(--text)" : "var(--muted)" }}>
                  {feature.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`role-badge role-${feature.minRole}`} style={{ fontSize: "9px" }}>
                  requires: {feature.minRole}
                </span>
                <span style={{ fontSize: "14px" }}>{allowed ? "✅" : "❌"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {role !== "admin" && (
        <div className="alert alert-info" style={{ fontSize: "11px" }}>
          <span>💡</span>
          <div>
            Log in as <code>admin@example.com</code> / <code>adminpass</code> to unlock all features
            and access the <Link href="/admin" style={{ color: "var(--edge)", textDecoration: "underline" }}>Admin Panel</Link>.
          </div>
        </div>
      )}

      {role === "admin" && (
        <div className="alert alert-success" style={{ fontSize: "11px" }}>
          <span>✓</span>
          <div>You have full access. Visit the <Link href="/admin" style={{ color: "var(--success)", textDecoration: "underline" }}>Admin Panel</Link> for admin-only features.</div>
        </div>
      )}
    </div>
  );
}