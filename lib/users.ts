/**
 * lib/users.ts — Simulated User Database
 * ─────────────────────────────────────────────────────────────────────────
 * In a real app: Prisma + Vercel Postgres with the schema below.
 * Here: in-memory store to keep the demo self-contained.
 *
 * REAL SCHEMA (Prisma):
 * model User {
 *   id            String    @id @default(cuid())
 *   email         String    @unique
 *   name          String?
 *   passwordHash  String?   // null for OAuth users
 *   role          Role      @default(USER)
 *   emailVerified DateTime?
 *   image         String?
 *   createdAt     DateTime  @default(now())
 *   accounts      Account[] // for OAuth
 *   sessions      Session[] // for DB session strategy
 * }
 * enum Role { USER EDITOR ADMIN }
 *
 * PASSWORD HASHING:
 * We use bcrypt with salt rounds = 12.
 * Never store plain-text passwords. Never use MD5 or SHA1.
 * bcrypt is slow by design — this is the protection against brute-force.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { UserRole } from "@/types/next-auth";

export type DBUser = {
  id: string;
  email: string;
  name: string;
  // Hashed with bcrypt rounds=12
  // "password123" → $2b$12$...
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

// Pre-hashed passwords for demo (rounds=10 for speed, use 12+ in production)
// Plain text for reference only — NEVER store or log these:
// alice@example.com → "password123"
// bob@example.com   → "password456"
// admin@example.com → "adminpass"
export const USERS: DBUser[] = [
  {
    id: "usr_alice_001",
    email: "alice@example.com",
    name: "Alice Chen",
    passwordHash: "$2b$10$aJDMfBXl9Om36GUgVSbnBe6drP6tpZ9WBbFTQYtsYsdGmkHAXgEZO", // password123
    role: "user",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "usr_bob_002",
    email: "bob@example.com",
    name: "Bob Martinez",
    passwordHash: "$2b$10$m/nY.Tn..fQCDUELlcj3xuKz8J2Gg25Wf2x5lTUAQYFd563aoJQR6", // password456
    role: "editor",
    createdAt: "2024-02-20T14:30:00Z",
  },
  {
    id: "usr_admin_003",
    email: "admin@example.com",
    name: "Admin User",
    passwordHash: "$2b$10$AlUftJXA3X7HIBbjZ34g3uiqXKq7j/4asgzIDmjO8oiamTNrTQMRi", // adminpass
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export async function findUserByEmail(email: string): Promise<DBUser | null> {
  // Simulate DB latency
  await new Promise(r => setTimeout(r, 80));
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<DBUser | null> {
  await new Promise(r => setTimeout(r, 80));
  return USERS.find(u => u.id === id) ?? null;
}