/**
 * Socket.io Event Constants
 * Safe to import from both client and server
 */

export const SOCKET_EVENTS = {
  // Dashboard events
  SALE_COMPLETED: "sale:completed",
  REVENUE_UPDATED: "revenue:updated",

  // Inventory events
  STOCK_UPDATED: "stock:updated",
  LOW_STOCK_ALERT: "inventory:low-stock-alert",
  STOCK_MOVEMENT: "inventory:movement",

  // POS events
  PRODUCT_STOCK_CHANGED: "pos:product-stock-changed",

  // Product events
  PRODUCT_CREATED: "product:created",
  PRODUCT_UPDATED: "product:updated",
  PRODUCT_DELETED: "product:deleted",

  // Customer events
  CUSTOMER_CREATED: "customer:created",
  CUSTOMER_UPDATED: "customer:updated",

  // Approval events
  APPROVAL_REQUESTED: "approval:requested",
  APPROVAL_RESOLVED: "approval:resolved",
};
