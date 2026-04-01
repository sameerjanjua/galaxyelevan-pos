import { Server } from "socket.io";

let ioInstance = null;
let httpServer = null;

/**
 * Initialize Socket.io server
 * Call this once from your Next.js server initialization
 */
export function initializeSocketIO(server) {
  if (ioInstance) {
    console.log("[Socket.io] Already initialized");
    return ioInstance;
  }

  httpServer = server;

  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Connection event
  ioInstance.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // User subscribes to tenant/location channels
    socket.on("join-tenant", (tenantId) => {
      socket.join(`tenant-${tenantId}`);
      console.log(
        `[Socket.io] User joined tenant channel: tenant-${tenantId}`
      );
    });

    socket.on("join-location", (locationId) => {
      socket.join(`location-${locationId}`);
      console.log(
        `[Socket.io] User joined location channel: location-${locationId}`
      );
    });

    socket.on("subscribe-dashboard", (tenantId) => {
      socket.join(`dashboard-${tenantId}`);
      console.log(
        `[Socket.io] User subscribed to dashboard: dashboard-${tenantId}`
      );
    });

    socket.on("subscribe-inventory", (tenantId) => {
      socket.join(`inventory-${tenantId}`);
      console.log(
        `[Socket.io] User subscribed to inventory: inventory-${tenantId}`
      );
    });

    socket.on("subscribe-pos", (locationId) => {
      socket.join(`pos-${locationId}`);
      console.log(`[Socket.io] User subscribed to POS: pos-${locationId}`);
    });

    socket.on("subscribe-products", (tenantId) => {
      socket.join(`products-${tenantId}`);
      console.log(
        `[Socket.io] User subscribed to products: products-${tenantId}`
      );
    });

    socket.on("subscribe-customers", (tenantId) => {
      socket.join(`customers-${tenantId}`);
      console.log(
        `[Socket.io] User subscribed to customers: customers-${tenantId}`
      );
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.io] Server initialized successfully");
  return ioInstance;
}

/**
 * Get the Socket.io instance (lazy initialization if needed)
 */
export function getSocketIOInstance() {
  return ioInstance;
}

/**
 * Check if Socket.io is initialized
 */
export function isSocketIOInitialized() {
  return ioInstance !== null;
}

/**
 * Wait for Socket.io to be initialized (with timeout)
 */
export async function waitForSocketIO(timeoutMs = 5000) {
  const startTime = Date.now();

  while (!ioInstance) {
    if (Date.now() - startTime > timeoutMs) {
      console.warn(
        "[Socket.io] Timeout waiting for initialization. Events will be ignored."
      );
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return ioInstance;
}

export default {
  initializeSocketIO,
  getSocketIOInstance,
  isSocketIOInitialized,
  waitForSocketIO,
};
