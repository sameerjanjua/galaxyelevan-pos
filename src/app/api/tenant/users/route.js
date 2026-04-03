import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, ROLES } from "@/lib/auth";
import { resolveLocationFilter } from "@/lib/resolveLocationFilter";
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

    // Extract selected location from query parameters
    const { searchParams } = new URL(req.url);
    const requestedLocationId = searchParams.get("locationId") || searchParams.get("selectedLocationId");

    const where = { tenantId: user.tenantId };
    
    // Apply centralized location filter based on sidebar selection
    const locationFilter = resolveLocationFilter(user, requestedLocationId);
    Object.assign(where, locationFilter);
    
    // Non-owners should not see the OWNER
    if (user.role !== ROLES.OWNER) {
      where.role = { not: ROLES.OWNER };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
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
    const { email, password, fullName, phoneNumber, role, locationId } = body;

    if (!email || !password || !fullName || !phoneNumber || !role) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, name, phone, role)" },
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

    // Staff must always have a location assigned
    if (role === ROLES.STAFF && !locationId) {
      return NextResponse.json(
        { error: "Staff members must be assigned to a specific location" },
        { status: 400 }
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
        phoneNumber,
        role,
        locationId: finalLocationId || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
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
