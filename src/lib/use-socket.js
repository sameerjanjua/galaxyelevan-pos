"use client";

import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

/**
 * useSocket - Hook for connecting to Socket.io server
 * @param {string|string[]} channels - Channel or channels to subscribe to
 * @param {Object} callbacks - Object with event callbacks {eventName: callback}
 */
export function useSocket(channels, callbacks = {}) {
  const socketRef = useRef(null);
  const channelsRef = useRef([]);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(undefined, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[useSocket] Connected to server:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("[useSocket] Disconnected from server");
    });

    socket.on("connect_error", (error) => {
      console.error("[useSocket] Connection error:", error);
    });

    // Subscribe to channels
    const channelList = Array.isArray(channels) ? channels : [channels];
    channelsRef.current = channelList;

    channelList.forEach((channel) => {
      socket.emit(channel);
      console.log("[useSocket] Subscribed to channel:", channel);
    });

    // Register event callbacks
    Object.entries(callbacks).forEach(([event, callback]) => {
      socket.on(event, callback);
    });

    return () => {
      // Cleanup
      Object.entries(callbacks).forEach(([event]) => {
        socket.off(event);
      });
      socket.disconnect();
    };
  }, []);

  const emit = useCallback(
    (event, data) => {
      if (socketRef.current) {
        socketRef.current.emit(event, data);
      }
    },
    []
  );

  const on = useCallback(
    (event, callback) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback);
      }
    },
    []
  );

  const off = useCallback(
    (event) => {
      if (socketRef.current) {
        socketRef.current.off(event);
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
  };
}

/**
 * useRealtimeData - Hook for subscribing to real-time data updates
 * @param {string} eventName - Event name to listen for
 * @param {Function} onData - Callback when data is received
 * @param {string|string[]} channels - Channels to subscribe to
 */
export function useRealtimeData(eventName, onData, channels) {
  const { on, off } = useSocket(channels);

  useEffect(() => {
    on(eventName, onData);

    return () => {
      off(eventName);
    };
  }, [eventName, onData, on, off]);
}
