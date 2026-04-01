# Socket.io Quick Reference Guide

## Quick Start

### 1. Import Socket Hooks
```javascript
import { useSocket } from "@/lib/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";
```

### 2. Basic Usage
```javascript
// Subscribe to events
const { emit, on, off } = useSocket("subscribe-dashboard");

// Listen for events
useEffect(() => {
  on(SOCKET_EVENTS.SALE_COMPLETED, handleSale);
  return () => off(SOCKET_EVENTS.SALE_COMPLETED);
}, [on, off]);
```

### 3. Server-Side Emission
```javascript
import { emitToDashboard, getSocketIoInstance, SOCKET_EVENTS } from "@/lib/socket-io";

// In API route
const io = getSocketIoInstance(req);
emitToDashboard(io, tenantId, SOCKET_EVENTS.SALE_COMPLETED, {
  invoiceNumber: "INV-123",
  total: 99.99,
});
```

## Available Channels

| Channel | Use Case | Function |
|---------|----------|----------|
| `tenant-{id}` | Tenant-wide events | `emitToTenant()` |
| `location-{id}` | Location-specific events | `emitToLocation()` |
| `dashboard-{id}` | Dashboard updates | `emitToDashboard()` |
| `inventory-{id}` | Inventory updates | `emitToInventory()` |
| `pos-{id}` | POS stock updates | `emitToPos()` |
| `products-{id}` | Product changes | `emitToProducts()` |
| `customers-{id}` | Customer updates | `emitToCustomers()` |

## Available Events

### Sales & Revenue
```javascript
SOCKET_EVENTS.SALE_COMPLETED        // new sale
SOCKET_EVENTS.REVENUE_UPDATED       // revenue changed
```

### Inventory
```javascript
SOCKET_EVENTS.STOCK_UPDATED         // stock level changed
SOCKET_EVENTS.LOW_STOCK_ALERT       // low stock alert
SOCKET_EVENTS.STOCK_MOVEMENT        // inventory movement
```

### Products
```javascript
SOCKET_EVENTS.PRODUCT_STOCK_CHANGED // product stock changed (POS)
SOCKET_EVENTS.PRODUCT_CREATED       // new product
SOCKET_EVENTS.PRODUCT_UPDATED       // product updated
SOCKET_EVENTS.PRODUCT_DELETED       // product deleted
```

### Customers
```javascript
SOCKET_EVENTS.CUSTOMER_CREATED      // new customer
SOCKET_EVENTS.CUSTOMER_UPDATED      // customer updated
```

## Common Patterns

### Pattern 1: Real-Time Counter
```javascript
const [count, setCount] = useState(0);
const { on, off } = useSocket("subscribe-dashboard");

useEffect(() => {
  on("count:updated", (data) => {
    setCount(data.newCount);
  });
  return () => off("count:updated");
}, [on, off]);
```

### Pattern 2: List Auto-Update
```javascript
const [items, setItems] = useState([]);
const { on, off } = useSocket("subscribe-inventory");

useEffect(() => {
  on(SOCKET_EVENTS.STOCK_UPDATED, (data) => {
    setItems((prev) => [...prev, data]);
  });
  return () => off(SOCKET_EVENTS.STOCK_UPDATED);
}, [on, off]);
```

### Pattern 3: Incremental State Update
```javascript
const [stock, setStock] = useState({});
const { on, off } = useSocket("subscribe-pos");

useEffect(() => {
  on(SOCKET_EVENTS.PRODUCT_STOCK_CHANGED, (data) => {
    setStock((prev) => ({
      ...prev,
      [data.productId]: (prev[data.productId] || 0) + data.quantity,
    }));
  });
  return () => off(SOCKET_EVENTS.PRODUCT_STOCK_CHANGED);
}, [on, off]);
```

## API Routes Updated

### POS Sale (`/api/pos/sale`)
Emits to: Dashboard, Inventory, POS
```javascript
SALE_COMPLETED      → Dashboard
REVENUE_UPDATED     → Dashboard
STOCK_UPDATED       → Inventory
PRODUCT_STOCK_CHANGED → POS
```

### Stock Adjustment (`/api/inventory/stock/adjust`)
Emits to: Inventory, POS, Location
```javascript
STOCK_UPDATED       → Inventory
LOW_STOCK_ALERT     → Inventory
PRODUCT_STOCK_CHANGED → POS
STOCK_MOVEMENT      → Location
```

### Product Creation (`/api/products`)
Emits to: Products, Inventory
```javascript
PRODUCT_CREATED     → Products
STOCK_UPDATED       → Inventory
```

## Debugging

### Check Connection
```javascript
// In browser console
window.io // Should show Socket.io object
socket?.connected // Should be true
```

### Monitor Events
```javascript
// In browser console
socket.onAny((event, ...args) => {
  console.log(`[Socket.io] ${event}`, args);
});
```

### Check Redux Store
```javascript
// View stock levels in Redux
store.getState().cart.stockLevels
```

## Common Issues

### Events Not Being Received?
1. Check channel subscription: `socket.connected`
2. Verify emit call on server side
3. Check browser console for errors

### High Memory Usage?
1. Ensure you're cleaning up listeners
2. Use `off()` in effect cleanup
3. Monitor open connections

### Events Duplicating?
1. Ensure listener is not added multiple times
2. Use effect cleanup properly
3. Check for multiple component mounts

## Performance Tips

1. **Subscribe Selectively:** Only listen to events you need
2. **Batch Updates:** Combine multiple state updates
3. **Cleanup Listeners:** Always remove listeners in effect cleanup
4. **Debounce Events:** Use throttled handlers for high-frequency events
5. **Keep Listeners Pure:** Avoid side effects in event handlers

## Files to Reference

- `src/lib/use-socket.js` - Client hooks
- `src/lib/socket-io.js` - Server utilities
- `src/app/api/socket/route.js` - Socket.io server
- `SOCKET_IO_GUIDE.md` - Full documentation
- `POS_OPTIMIZATION_REPORT.md` - Performance report

## Support

For issues or questions:
1. Check SOCKET_IO_GUIDE.md for detailed documentation
2. Review POS_OPTIMIZATION_REPORT.md for optimization details
3. Check browser console for Socket.io debug info
4. Verify API route is emitting events correctly
