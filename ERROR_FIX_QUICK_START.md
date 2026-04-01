# Socket.io Error Fix - Quick Resolution

## Error That Was Fixed

```
TypeError: Cannot read properties of undefined (reading 'server')
    at getSocketIoInstance (src\lib\socket-io.js:7:21)
    at POST (src\app\api\pos\sale\route.js:265:35)
```

## Root Cause

Next.js 16+ App Router doesn't expose `req.socket.server` like Pages Router did. The code was trying to access an undefined property.

## The Fix (3 Steps)

### Step 1: Run with Custom Server
```bash
npm run dev
```

This uses the new `server.js` instead of `next dev`, which properly initializes Socket.io.

### What Changed

**Old code (broke):**
```javascript
const io = getSocketIoInstance(req);  // ❌ req.socket.server is undefined
```

**New code (works):**
```javascript
const io = getSocketIoInstance();  // ✅ Uses singleton instance
```

### Behind the Scenes

1. `server.js` creates HTTP server
2. Passes it to `initializeSocketIO()`
3. Socket.io gets attached to server
4. API routes retrieve instance from singleton
5. Events emit successfully

## Files Modified

✅ `server.js` - New custom Next.js server with Socket.io
✅ `src/lib/socket-io-server.js` - Singleton instance manager
✅ `src/lib/socket-io.js` - Updated to use singleton
✅ `src/app/api/pos/sale/route.js` - Calls `getSocketIoInstance()` without req
✅ `src/app/api/inventory/stock/adjust/route.js` - Same fix
✅ `src/app/api/products/route.js` - Same fix
✅ `package.json` - Updated dev & start scripts

## How to Verify It's Working

**Terminal Output:**
```
✓ Server running at http://localhost:3000
✓ Socket.io initialized and listening for connections
```

**Browser Console:**
```javascript
window.io  // Should show Socket.io object
socket?.connected  // Should be true
```

**No More Error:**
- Complete a sale in POS
- Stock updates instantly
- No TypeError in console

## Comparison

| Before | After |
|--------|-------|
| `next dev` | `node server.js` |
| Crashes with undefined error | Works perfectly |
| No Socket.io | Full real-time support |
| Polling every 5 seconds | Event-driven updates |

## Stop Development Server

If `npm run dev` is currently running:
1. Press `Ctrl+C` (Windows) or `Cmd+C` (Mac)
2. Run: `npm run dev`
3. Browser automatically refreshes

## Back to Regular Next.js (Optional)

If you need the old behavior without Socket.io:
```bash
npm run dev:next
```

Note: This won't use Socket.io, just regular Next.js with polling.

## Error Resolution Checklist

- [ ] Stopped previous development server
- [ ] Running `npm run dev` (not `next dev`)
- [ ] Browser shows no errors in console
- [ ] Can see Socket.io connection in Network tab
- [ ] POS page loads without 500 error
- [ ] Real-time events working

## If Still Getting Error

1. **Clear Everything:**
   ```bash
   npm run dev
   ```

2. **Hard Refresh Browser:**
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

3. **Check Port Not Blocked:**
   ```bash
   lsof -i :3000  # Check if port in use
   PORT=3001 npm run dev  # Try different port
   ```

4. **Check Logs:**
   - Look for "[Socket.io] Server initialized successfully"
   - If not shown, server didn't start properly

## Success Indicators

✅ `npm run dev` starts server
✅ Socket.io logs show initialization
✅ Browser connects to Socket.io
✅ No 500 errors on API calls
✅ Real-time updates work instantly

---

**You're all set!** The error is fixed. Just run `npm run dev` and enjoy full Socket.io real-time functionality.
