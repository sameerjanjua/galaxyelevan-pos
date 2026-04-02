"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useActiveLocation } from "@/lib/useActiveLocation";
import { InventoryClient } from "./InventoryClient";

export default function InventoryDashboard() {
  const [alerts, setAlerts] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const user = useSelector((state) => state.auth.user);
  const tenantId = user?.tenantId ?? null;
  
  const { activeLocationId } = useActiveLocation();
  const lastFetchKeyRef = useRef(null);

  useEffect(() => {
    const fetchKey = activeLocationId || "all";
    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }

    lastFetchKeyRef.current = fetchKey;
    fetchData();
  }, [activeLocationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeLocationId) {
        params.set("locationId", activeLocationId);
      }
      
      const alertsParams = new URLSearchParams(params);
      const valParams = new URLSearchParams(params);
      const movParams = new URLSearchParams(params);
      movParams.set("limit", "10");

      const [alertsRes, valuationRes, movementsRes] = await Promise.all([
        fetch(`/api/tenant/inventory/alerts/low-stock?${alertsParams.toString()}`),
        fetch(`/api/tenant/inventory/reports/valuation?${valParams.toString()}`),
        fetch(`/api/tenant/inventory/stock/movements?${movParams.toString()}`),
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
