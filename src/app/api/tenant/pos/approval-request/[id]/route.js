import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ROLES, hasRole } from "@/lib/auth";
import {
  emitToPos,
  getSocketIoInstance,
} from "@/lib/socket-io.server";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export async function PATCH(req, { params }) {
  try {
    const user = await requireUser();
    
    // Only owners and managers can approve/reject requests
    if (!hasRole(user, [ROLES.OWNER, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, note } = body;

    if (!["APPROVED", "REJECTED", "VOID"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        note, // Resolution note (e.g. rejection reason)
        approverId: user.id,
      },
      include: {
        requester: {
          select: {
            fullName: true,
            email: true,
          }
        },
        approver: {
          select: {
            fullName: true,
            email: true,
          }
        }
      }
    });

    // Notify the POS at the specific location
    const io = getSocketIoInstance(req);
    if (io) {
      emitToPos(io, updatedRequest.locationId, SOCKET_EVENTS.APPROVAL_RESOLVED, updatedRequest);
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[Approval Request PATCH Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
