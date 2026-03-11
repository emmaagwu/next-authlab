// /**
//  * types/next-auth.d.ts
//  * ─────────────────────────────────────────────────────────────────────────
//  * TypeScript module augmentation for Auth.js v5
//  *
//  * WHY THIS FILE EXISTS:
//  * Auth.js's Session type only includes { user: { name, email, image } }
//  * by default. We need to add 'role' and 'id' to the session so that:
//  *  1. TypeScript knows session.user.role exists (no "any" casting)
//  *  2. We can use role in middleware for RBAC without a DB lookup
//  *  3. The role is available in both Server Components and Client Components
//  *
//  * HOW IT WORKS:
//  * The role is stored INSIDE the JWT (in the jwt() callback in auth.ts).
//  * The jwt() callback fires on every token creation/refresh.
//  * The session() callback reads from the token and exposes it to the app.
//  * ─────────────────────────────────────────────────────────────────────────
//  */
// import "next-auth";
// import { DefaultSession } from "next-auth";

// // Define the roles in our system
// export type UserRole = "admin" | "editor" | "user";

// declare module "next-auth" {
//   interface Session {
//     user: {
//       id: string;
//       role: UserRole;
//     } & DefaultSession["user"]; // keeps name, email, image
//   }

//   interface User {
//     role?: UserRole;
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     id: string;
//     role: UserRole;
//   }
// }



import "next-auth";
import "next-auth/jwt";

export type UserRole = "admin" | "editor" | "user";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}