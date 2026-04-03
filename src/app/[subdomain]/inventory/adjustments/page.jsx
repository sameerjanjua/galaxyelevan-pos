"use client";

import { Suspense } from "react";
import AdjustmentsForm from "@/components/tenant/inventory/adjustments/InventoryAdjustmentForm";

export default function StockAdjustments() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-center">Loading...</div>}>
      <AdjustmentsForm />
    </Suspense>
  );
}
