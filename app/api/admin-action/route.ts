import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { type, spoofedUserId } = await request.json();

  // ALWAYS call auth() — get user from session, not from client
  const session = await auth();

  if (type === "valid") {
    if (!session) {
      return NextResponse.json({ allowed: false, message: "Not authenticated" });
    }
    return NextResponse.json({
      allowed: true,
      message: `Action performed for ${session.user.email}`,
      sessionUser: session.user.id,
      code: `const session = await auth();\nif (!session) throw new Error('401');\n// User confirmed: ${session.user.id}\nawait db.post.create({ data: { authorId: session.user.id, ... } });`,
    });
  }

  if (type === "spoof") {
    if (!session) {
      return NextResponse.json({ allowed: false, message: "Not authenticated" });
    }
    // The client sent spoofedUserId — we IGNORE it completely
    return NextResponse.json({
      allowed: false,
      message: `Client sent userId="${spoofedUserId}" but we IGNORED it. Using session.user.id="${session.user.id}" instead.`,
      sessionUser: session.user.id,
      spoofedId: spoofedUserId,
      code: `// NEVER use client-passed user IDs:\n// ❌ db.post.create({ data: { authorId: req.body.userId } })\n// ✅ db.post.create({ data: { authorId: session.user.id } })`,
    });
  }

  if (type === "admin") {
    if (!session) {
      return NextResponse.json({ allowed: false, message: "Not authenticated" });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({
        allowed: false,
        message: `Role "${session.user.role}" cannot perform admin actions. Required: "admin".`,
        sessionUser: session.user.id,
        code: `const session = await auth();\nif (session.user.role !== 'admin')\n  throw new Error('403 Forbidden');`,
      });
    }
    return NextResponse.json({
      allowed: true,
      message: "Admin action allowed.",
      sessionUser: session.user.id,
    });
  }

  return NextResponse.json({ allowed: false, message: "Unknown action type" });
}