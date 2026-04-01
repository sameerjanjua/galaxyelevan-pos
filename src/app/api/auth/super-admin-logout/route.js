import { NextResponse } from "next/server";
import { clearSuperAdminSession } from "@/lib/auth";

export async function POST() {
    try {
        await clearSuperAdminSession();

        return NextResponse.json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Super admin logout error:", error);
        return NextResponse.json(
            { error: "An error occurred during logout" },
            { status: 500 }
        );
    }
}
