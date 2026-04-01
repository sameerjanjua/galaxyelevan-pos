"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InventoryClient } from "./InventoryClient";

export default function InventoryDashboard() {
  const [alerts, setAlerts] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    fetchData();
    // Get tenant ID from session
    const getTenantId = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          setTenantId(user.tenantId);
        }
      } catch (error) {
        console.error("Error fetching tenant ID:", error);
      }
    };
    getTenantId();
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
