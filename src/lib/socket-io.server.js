/**
 * Socket.io Server Utilities
 * IMPORTANT: Server-side only! Do NOT import in client components
 * Use 'use server' directive or import only in API routes
 */

import { getSocketIOInstance } from "./socket-io-server.js";

export function getSocketIoInstance(req) {
  try {
    // Try to get from request (fallback)
    if (req?.socket?.server?.io) {
      return req.socket.server.io;
    }
  } catch (error) {
    console.warn("[Socket.io] Could not access Socket.io from request");
  }

  // Use singleton instance as primary method
  return getSocketIOInstance();
}

export function emitToTenant(io, tenantId, event, data) {
  if (!io) return;
  io.to(`tenant-${tenantId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to tenant-${tenantId}:`, data);
}

export function emitToLocation(io, locationId, event, data) {
  if (!io) return;
  io.to(`location-${locationId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to location-${locationId}:`, data);
}

export function emitToDashboard(io, tenantId, event, data) {
  if (!io) return;
  io.to(`dashboard-${tenantId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to dashboard-${tenantId}:`, data);
}

export function emitToInventory(io, tenantId, event, data) {
  if (!io) return;
  io.to(`inventory-${tenantId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to inventory-${tenantId}:`, data);
}

export function emitToPos(io, locationId, event, data) {
  if (!io) return;
  io.to(`pos-${locationId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to pos-${locationId}:`, data);
}

export function emitToProducts(io, tenantId, event, data) {
  if (!io) return;
  io.to(`products-${tenantId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to products-${tenantId}:`, data);
}

export function emitToCustomers(io, tenantId, event, data) {
  if (!io) return;
  io.to(`customers-${tenantId}`).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to customers-${tenantId}:`, data);
}
