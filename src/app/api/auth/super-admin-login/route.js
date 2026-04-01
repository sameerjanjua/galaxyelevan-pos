import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSuperAdminSession } from "@/lib/auth";
import crypto from "node:crypto";

function verifyPassword(storedHash, password) {
    const [salt, hash] = storedHash.split(":");
    const newHash = crypto.pbkdf2Sync(password, Buffer.from(salt, "hex"), 310000, 32, "sha256");
    return hash === newHash.toString("hex");
}

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Find super admin by email
        const superAdmin = await prisma.superAdmin.findUnique({
            where: { email },
        });

        if (!superAdmin || !superAdmin.isActive) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Verify password
        if (!verifyPassword(superAdmin.passwordHash, password)) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Create session
        await createSuperAdminSession(superAdmin.id);

        return NextResponse.json({
            success: true,
            message: "Login successful",
            user: {
                id: superAdmin.id,
                email: superAdmin.email,
                fullName: superAdmin.fullName,
            },
        });
    } catch (error) {
        console.error("Super admin login error:", error);
        return NextResponse.json(
            { error: "An error occurred during login" },
            { status: 500 }
        );
    }
}
