import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await requireUser();

    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin || false,
    };

    if (!user.isSuperAdmin) {
      userData.tenantId = user.tenantId;
      userData.locationId = user.locationId;
      userData.role = user.role;
    }

    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
