"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { InventoryClient } from "./InventoryClient";

export default function InventoryDashboard() {
  const [alerts, setAlerts] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state) => state.auth.user);
  const tenantId = user?.tenantId ?? null;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, valuationRes, movementsRes] = await Promise.all([
        fetch("/api/inventory/alerts/low-stock"),
        fetch("/api/inventory/reports/valuation"),
        fetch("/api/inventory/stock/movements?limit=10"),
      ]);

      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (valuationRes.ok) setValuation(await valuationRes.json());
      if (movementsRes.ok) {
        const data = await movementsRes.json();
        setMovements(data.movements || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !tenantId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading inventory dashboard...</div>
      </div>
    );
  }

  return (
    <InventoryClient
      initialAlerts={alerts}
      initialValuation={valuation}
      initialMovements={movements}
      tenantId={tenantId}
    />
  );
}
