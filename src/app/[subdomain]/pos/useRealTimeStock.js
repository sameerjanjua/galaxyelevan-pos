import { useEffect, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "@/lib/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";

export function useRealTimeStock(productIds = null, enabled = true, locationId = null) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastLocationId, setLastLocationId] = useState(locationId);
  const lastUpdateRef = useRef(null);
  const manualRefreshRef = useRef(null);

  // Socket.io connection
  const { emit, on, off } = useSocket(`subscribe-pos`);

  // Fetch stock levels from API (only on initial load, not polling)
  const fetchStockLevelsInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/pos/stock-levels", window.location.origin);
      if (productIds && productIds.length > 0) {
        productIds.forEach((id) => url.searchParams.append("productIds", id));
      }

      if (locationId) {
        url.searchParams.append("locationId", locationId);
      }

      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      });

      if (!response.ok) {
        throw new Error(`Stock fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.products) {
        if (locationId && data.locationId !== locationId) {
          console.warn(`Stock response location mismatch. Expected: ${locationId}, Got: ${data.locationId}`);
          return;
        }

        const stockMap = {};
        data.products.forEach((p) => {
          stockMap[p.id] = p;
        });

        dispatch({
          type: "cart/updateStockLevels",
          payload: stockMap,
        });

        lastUpdateRef.current = new Date();
        setLastLocationId(locationId);
      }
      setLoading(false);
    } catch (err) {
      console.error("Stock level fetch error:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [productIds, dispatch, locationId]);

  // Expose manual refresh function
  useEffect(() => {
    manualRefreshRef.current = fetchStockLevelsInitial;
  }, [fetchStockLevelsInitial]);

  // Listen for real-time stock updates from Socket.io
  useEffect(() => {
    if (!enabled || !locationId) return;

    // Subscribe to location-specific POS updates
    if (emit) {
      emit("subscribe-pos", locationId);
    }

    // Handle real-time stock changes
    const handleStockChange = (data) => {
      if (data && data.productId) {
        // Dispatch incremental update for this specific product
        dispatch({
          type: "cart/updateSingleProductStock",
          payload: {
            productId: data.productId,
            quantity: data.quantity,
          },
        });

        lastUpdateRef.current = new Date();
      }
    };

    // Listen for stock changes
    on(SOCKET_EVENTS.PRODUCT_STOCK_CHANGED, handleStockChange);

    return () => {
      off(SOCKET_EVENTS.PRODUCT_STOCK_CHANGED);
    };
  }, [enabled, locationId, emit, on, off, dispatch]);

  // Initial load only - fetch stock once on mount
  useEffect(() => {
    if (!enabled || !locationId) return;

    // Only fetch on initial load or location change
    if (lastLocationId !== locationId) {
      fetchStockLevelsInitial();
    }
  }, [enabled, locationId, lastLocationId, fetchStockLevelsInitial]);

  return {
    lastUpdate: lastUpdateRef.current,
    loading,
    error,
    refreshNow: fetchStockLevelsInitial,
  };
}
