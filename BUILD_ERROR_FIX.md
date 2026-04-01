# Build Error Fix - Module 'fs' Not Found

## Problem
```
Module not found: Can't resolve 'fs'
socket.io/dist/index.js:31
```

The Socket.io server library (which uses Node.js-only modules like `fs`) was being bundled into client-side code.

## Root Cause
Client components were importing server-side Socket.io functions, causing the entire `socket.io` library to be bundled for the browser, which doesn't support Node.js APIs.

## Solution
**Separated server and client code into different files:**

### New Architecture

```
socket-io-constants.js      ← Safe for all code (just event names)
    ↓
socket-io.js                ← Client-safe (re-exports constants)
    ↓
Client Code ✅ SAFE

socket-io.server.js         ← Server-only (emit functions)
    ↓
API Routes ✅ SAFE
```

### Files Created/Updated

| File | Purpose | Safe For |
|------|---------|----------|
| `src/lib/socket-io-constants.js` | ✨ NEW - Event constants only | Client & Server |
| `src/lib/socket-io.js` | Updated - Now just re-exports constants | Client only |
| `src/lib/socket-io.server.js` | ✨ NEW - Emit functions (server-only) | Server only |
| `src/lib/socket-io-server.js` | Existed - Singleton instance | Server only |

### Import Rules Now

**✅ Client Code (Components):**
```javascript
import { SOCKET_EVENTS } from "@/lib/socket-io";
```

**✅ Server Code (API Routes):**
```javascript
import { getSocketIoInstance, emitToDashboard } from "@/lib/socket-io.server";
import { SOCKET_EVENTS } from "@/lib/socket-io";
```

**❌ NEVER in Client:**
```javascript
// These cause the error:
import { getSocketIoInstance } from "@/lib/socket-io.server";
import { emitToDashboard } from "@/lib/socket-io";
```

### Files Updated

✅ `src/app/api/pos/sale/route.js` - Now imports from .server file
✅ `src/app/api/inventory/stock/adjust/route.js` - Now imports from .server file
✅ `src/app/api/products/route.js` - Now imports from .server file
✅ `src/app/customers/page.jsx` - Removed unused server imports
✅ `src/app/dashboard/DashboardClient.jsx` - Already safe (only constants)
✅ `src/app/inventory/InventoryClient.jsx` - Already safe (only constants)
✅ `src/app/pos/useRealTimeStock.js` - Already safe (only constants)

## How It Works

### Before (Error)
```
Client Code
    ↓
imports SOCKET_EVENTS from socket-io.js
    ↓
socket-io.js imports socket-io-server.js
    ↓
socket-io-server.js imports "socket.io"
    ↓
socket.io library bundled in browser
    ↓
❌ Module 'fs' not found (Node.js API in browser)
```

### After (Fixed)
```
Client Code
    ↓
imports SOCKET_EVENTS from socket-io.js
    ↓
socket-io.js imports from socket-io-constants.js
    ↓
socket-io-constants.js only has string constants
    ↓
✅ No server libraries bundled in browser
```

## Verification

Check that the build error is gone:

```bash
npm run dev
# Should compile without "Module 'fs' not found" error
```

Browser console should show:
```javascript
window.io  // Socket.io client available
socket?.connected  // Should be true
```

## Summary of Changes

1. **Created** `socket-io-constants.js` - Event names safe for all code
2. **Created** `socket-io.server.js` - Server-only emission functions
3. **Updated** `socket-io.js` - Now only re-exports constants (client-safe)
4. **Updated** 3 API routes - Import server functions from `.server` file
5. **Removed** unused imports from `customers/page.jsx`

## Testing

```bash
# Development
npm run dev

# Should compile without errors
# Should see Socket.io connection logs
# POS and real-time features should work
```

## Key Takeaway

**Never import server-side code in client components.**

- ✅ `socket-io.js` - Safe everywhere
- ❌ `socket-io.server.js` - Server only
- ❌ `socket-io-server.js` - Server only

This separation ensures Node.js modules stay on the server and don't leak into the browser bundle.
