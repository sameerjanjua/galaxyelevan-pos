import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ROLES, hasRole } from "@/lib/auth";
import {
  emitToDashboard,
  getSocketIoInstance,
} from "@/lib/socket-io.server";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export async function POST(req) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { type, data, reason, locationId } = body;

    if (!type || !locationId) {
      return NextResponse.json(
        { error: "Type and locationId are required." },
        { status: 400 }
      );
    }

    const request = await prisma.approvalRequest.create({
      data: {
        type,
        data: data || {},
        reason,
        tenantId: user.tenantId,
        locationId,
        requesterId: user.id,
        status: "PENDING",
      },
      include: {
        requester: {
          select: {
            fullName: true,
            email: true,
          }
        }
      }
    });

    const io = getSocketIoInstance(req);
    if (io) {
      emitToDashboard(io, user.tenantId, SOCKET_EVENTS.APPROVAL_REQUESTED, request);
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error("[Approval Request POST Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    
    const id = searchParams.get("id");
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status"); // Optional status filter
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const isManager = hasRole(user, [ROLES.OWNER, ROLES.MANAGER]);
    
    const where = {
      tenantId: user.tenantId,
    };

    // 🛡️ Security: If user is not a manager/owner, they can ONLY see their own requests
    if (!isManager) {
      where.requesterId = user.id;
    }

    // Apply filters
    if (id) {
      where.id = id;
    }
    
    if (status === "ALL") {
      where.status = { not: "PENDING" };
    } else if (status) {
      where.status = status;
    } else if (!id && !startDate && !endDate && isManager) {
      // Default to PENDING for managers if no specific query is made
      where.status = "PENDING";
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const requests = await prisma.approvalRequest.findMany({
      where,
        include: {
          requester: { select: { fullName: true, email: true } },
          location: { select: { name: true } },
          approver: { select: { fullName: true, email: true } },
          sale: { select: { invoiceNumber: true } },
        },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[Approval Request GET Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
