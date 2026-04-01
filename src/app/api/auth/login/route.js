import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

function verifyPassword(stored, password) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashed = crypto
    .pbkdf2Sync(password, salt, 310000, 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashed));
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing credentials." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          select: { isSuspended: true, slug: true, name: true },
        },
      },
    });

    if (!user || !verifyPassword(user.passwordHash, password)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Your account has been disabled. Please contact support.",
          code: "ACCOUNT_DISABLED",
        },
        { status: 403 },
      );
    }

    // Check if business is suspended
    if (user.tenant.isSuspended) {
      return NextResponse.json(
        {
          error: "This business account has been suspended. Please contact support.",
          code: "BUSINESS_SUSPENDED",
        },
        { status: 403 },
      );
    }

    await createSession(user.id, user.tenantId, user.tenant.slug, user.tenant.name);
    
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          tenantId: user.tenantId,
          locationId: user.locationId,
          role: user.role,
          tenantSlug: user.tenant.slug,
          tenantName: user.tenant.name,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to login." },
      { status: 500 },
    );
  }
}

