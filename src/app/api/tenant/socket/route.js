import { Server } from "socket.io";
import { NextResponse } from "next/server";

export async function GET(req) {
  if (req.socket.server.io) {
    return NextResponse.json({ status: "Socket.io already running" });
  }

  const io = new Server(req.socket.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Connection event
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // User subscribes to tenant/location channels
    socket.on("join-tenant", (tenantId) => {
      socket.join(`tenant-${tenantId}`);
      console.log(`[Socket.io] User joined tenant channel: tenant-${tenantId}`);
    });

    socket.on("join-location", (locationId) => {
      socket.join(`location-${locationId}`);
      console.log(`[Socket.io] User joined location channel: location-${locationId}`);
    });

    socket.on("subscribe-dashboard", (tenantId) => {
      socket.join(`dashboard-${tenantId}`);
      console.log(`[Socket.io] User subscribed to dashboard: dashboard-${tenantId}`);
    });

    socket.on("subscribe-inventory", (tenantId) => {
      socket.join(`inventory-${tenantId}`);
      console.log(`[Socket.io] User subscribed to inventory: inventory-${tenantId}`);
    });

    socket.on("subscribe-pos", (locationId) => {
      socket.join(`pos-${locationId}`);
      console.log(`[Socket.io] User subscribed to POS: pos-${locationId}`);
    });

    socket.on("subscribe-products", (tenantId) => {
      socket.join(`products-${tenantId}`);
      console.log(`[Socket.io] User subscribed to products: products-${tenantId}`);
    });

    socket.on("subscribe-customers", (tenantId) => {
      socket.join(`customers-${tenantId}`);
      console.log(`[Socket.io] User subscribed to customers: customers-${tenantId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  req.socket.server.io = io;

  return NextResponse.json({ status: "Socket.io initialized" });
}
