import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import crypto from "node:crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 310000, 32, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function GET() {
  try {
    const user = await requireUser();
    
    // Fetch full details from database to ensure up-to-date info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Fetch profile error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { fullName, phoneNumber, currentPassword, newPassword } = body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phoneNumber !== undefined) {
      if (!phoneNumber.trim()) {
        return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
      }
      updateData.phoneNumber = phoneNumber.trim();
    }

    // Handle password update if provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      const [salt, storedHash] = dbUser.passwordHash.split(":");
      const hash = crypto
        .pbkdf2Sync(currentPassword, salt, 310000, 32, "sha256")
        .toString("hex");

      if (hash !== storedHash) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }

      updateData.passwordHash = hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
