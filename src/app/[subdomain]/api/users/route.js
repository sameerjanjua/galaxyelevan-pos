import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";
import crypto from "node:crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 310000, 32, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function GET(req) {
  try {
    const user = await requireUser();
    
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const where = { tenantId: user.tenantId };
    
    // Non-owners can only see users based on their location and NEVER see the OWNER
    if (user.role !== ROLES.OWNER) {
      const locationFilter = getLocationFilter(user);
      Object.assign(where, locationFilter);
      where.role = { not: ROLES.OWNER };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
          }
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireUser();
    
    // Require OWNER or MANAGER role
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const body = await req.json();
    const { email, password, fullName, role, locationId } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Only owners can create other owner accounts
    if (role === ROLES.OWNER && user.role !== ROLES.OWNER) {
      return NextResponse.json(
        { error: "Only owners can create owner accounts" },
        { status: 403 }
      );
    }

    // Ensure email is unique across the entire system
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }

    // Managers can only create users for their own location
    let finalLocationId = locationId;
    if (user.role === ROLES.MANAGER) {
      if (role !== ROLES.STAFF) {
        return NextResponse.json(
          { error: "Managers can only create staff accounts" },
          { status: 403 }
        );
      }
      finalLocationId = user.locationId;
    }

    const passwordHash = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        email,
        passwordHash,
        fullName,
        role,
        locationId: finalLocationId || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        locationId: true,
      }
    });

    return NextResponse.json(
      { success: true, user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
