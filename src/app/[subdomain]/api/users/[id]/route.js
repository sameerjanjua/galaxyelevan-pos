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

export async function PATCH(req, props) {
  try {
    const params = await props.params;
    const { id } = params;
    const user = await requireUser();
    
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    const body = await req.json();
    const { email, fullName, role, locationId, isActive, password } = body;

    // Verify the target user belongs to this tenant
    const targetUser = await prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Managers can only edit themselves or STAFF at their location
    if (user.role === ROLES.MANAGER) {
      if (targetUser.id !== user.id) {
        // Not editing themselves, must be a STAFF at their location
        if (targetUser.locationId !== user.locationId || targetUser.role !== ROLES.STAFF) {
          return NextResponse.json({ error: "Access denied: cannot modify this user" }, { status: 403 });
        }
      }
    }

    // Prevent changing owner role unless you are the owner
    if (targetUser.role === ROLES.OWNER && user.id !== targetUser.id && user.role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Cannot modify owner accounts" }, { status: 403 });
    }

    // Prepare update data
    const updateData = {};
    // Handle email change logic
    if (email && email !== targetUser.email) {
      // Only owners can change emails
      if (user.role !== ROLES.OWNER) {
        return NextResponse.json({ error: "Access denied: only owners can change email addresses" }, { status: 403 });
      }

      // Ensure the new email is unique across the system
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }

      updateData.email = email;
    }
    if (fullName) updateData.fullName = fullName;
    
    // Only allow role changes if current user is OWNER
    // OR if Manager is creating (POST), but this is PATCH
    if (role && user.role === ROLES.OWNER) {
      updateData.role = role;
    }
    
    // Only allow location changes if current user is OWNER
    if (locationId !== undefined && user.role === ROLES.OWNER) {
      updateData.locationId = locationId || null;
    }
    
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (password) {
      updateData.passwordHash = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        locationId: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target.includes('email')) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req, props) {
  try {
    const params = await props.params;
    const { id } = params;
    const user = await requireUser();
    
    const roleError = requireRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    if (roleError) return roleError;

    // Verify target user belongs to tenant
    const targetUser = await prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Managers can only deactivate STAFF at their location
    if (user.role === ROLES.MANAGER) {
      if (targetUser.locationId !== user.locationId || targetUser.role !== ROLES.STAFF) {
        return NextResponse.json({ error: "Access denied: cannot deactivate this user" }, { status: 403 });
      }
    }

    if (targetUser.id === user.id) {
       return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
    }

    if (targetUser.role === ROLES.OWNER && user.role !== ROLES.OWNER) {
       return NextResponse.json({ error: "Cannot deactivate owner accounts" }, { status: 403 });
    }

    // Deactivate user instead of hard deletion to maintain history
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "User deactivated" }, { status: 200 });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
