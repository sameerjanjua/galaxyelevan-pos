"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  addItem, 
  changeQty, 
  setItemDiscount, 
  setItemPrice, 
  setCustomer, 
  setGlobalDiscount, 
  hydrateCart 
} from "@/store/cart/cartSlice";
import { createSale } from "@/store/cart/cartThunks";
import { fetchCategories } from "@/store/categories/categoryThunks";
import { toast } from "sonner";
import { ProductEditModal } from "./ProductEditModal";
import { GlobalDiscountModal } from "./GlobalDiscountModal";
import { RequestApprovalModal } from "./RequestApprovalModal";
import { useRealTimeStock } from "@/hooks/useRealTimeStock";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { useSocket } from "@/hooks/use-socket";
import { SOCKET_EVENTS } from "@/lib/socket-io";

// Redux Approvals
import { 
  fetchPendingRequests, 
  createApprovalRequest 
} from "@/store/approvals/approvalsThunks";
import { 
  removePendingRequest, 
  setLastResolved, 
  clearLastResolved 
} from "@/store/approvals/approvalsSlice";

// Modularized Components
import { PosHeader } from "./PosHeader";
import { CategoryChips } from "./CategoryChips";
import { ProductGrid } from "./ProductGrid";
import { CartSidebar } from "./CartSidebar";

const STORAGE_KEY = "pos_cart_v1";

export function PosClient({ customers, allLocations, user }) {
  const dispatch = useDispatch();
  
  const cartState = useSelector((state) => state.cart);
  const { items: cartItems, customerId, globalDiscountValue, globalDiscountType, loading: cartLoading } = cartState;
  const { items: categories, status: catStatus } = useSelector((state) => state.categories);
  const { pending: pendingApprovals, lastResolved } = useSelector((state) => state.approvals);
  const stockLevels = cartState.stockLevels;

  const { activeLocationId, activeLocationName, isAllLocations } = useActiveLocation();
  const effectiveLocationId = activeLocationId || allLocations?.[0]?.id;
  const effectiveLocationName = activeLocationId ? activeLocationName : allLocations?.[0]?.name || "Default";

  // Local States
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [editingItem, setEditingItem] = useState(null);
  const [isGlobalDiscountOpen, setIsGlobalDiscountOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [tenant, setTenant] = useState(null);

  // Persistence: Hydrate from LocalStorage
  const isHydrated = useRef(false);
  useEffect(() => {
    if (!isHydrated.current) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          dispatch(hydrateCart(parsed));
        } catch (e) {
          console.error("Failed to hydrate POS state:", e);
        }
      }
      isHydrated.current = true;
    }
  }, [dispatch]);

  // Persistence: Save to LocalStorage
  useEffect(() => {
    if (isHydrated.current) {
      const stateToSave = { items: cartItems, customerId, globalDiscountValue, globalDiscountType };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [cartItems, customerId, globalDiscountValue, globalDiscountType]);

  const detailedCart = useMemo(() => {
    return cartItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const originalPrice = Number(product.salePrice);
      const effectivePrice = item.customPrice !== null ? Number(item.customPrice) : originalPrice;
      const lineTotalBeforeDiscount = effectivePrice * item.quantity;
      let lineDiscountAmount = 0;
      if (item.discountValue > 0) lineDiscountAmount = item.discountType === "PERCENT" ? lineTotalBeforeDiscount * (item.discountValue / 100) : item.discountValue;
      lineDiscountAmount = Math.min(lineDiscountAmount, lineTotalBeforeDiscount);
      const lineTotal = lineTotalBeforeDiscount - lineDiscountAmount;
      const isPriceOverridden = item.customPrice !== null && Number(item.customPrice) !== originalPrice;
      const isDiscountOverridden = item.discountValue > 0;

      return { 
        ...item, 
        product, 
        originalPrice, 
        price: effectivePrice, 
        lineTotalBeforeDiscount, 
        lineDiscountAmount, 
        lineTotal,
        isPriceOverridden,
        isDiscountOverridden
      };
    }).filter((v) => v !== null);
  }, [cartItems, products]);

  const subtotal = detailedCart.reduce((sum, item) => sum + item.lineTotal, 0);
  const globalDiscountAmount = globalDiscountValue > 0 ? (globalDiscountType === "PERCENT" ? (subtotal * globalDiscountValue) / 100 : globalDiscountValue) : 0;
  const total = subtotal - Math.min(globalDiscountAmount, subtotal);

  // 🚀 ACTION: Finalize Order
  const handleSubmit = useCallback(async () => {
    if (detailedCart.length === 0) return;
    if (cartLoading) return;
    try {
      const resultAction = await dispatch(createSale({ customerId, globalDiscountValue, globalDiscountType, locationId: effectiveLocationId }));
      if (createSale.fulfilled.match(resultAction)) {
        localStorage.removeItem(STORAGE_KEY);
        toast.success(`Sale completed successfully!`);
      } else { toast.error(resultAction.payload || "Failed to complete sale."); }
    } catch { toast.error("Network error finalizing sale."); }
  }, [dispatch, customerId, globalDiscountValue, globalDiscountType, effectiveLocationId, detailedCart.length, cartLoading]);

  // 📡 UNIFIED RESOLUTION WATCHER: Handles both Socket & Manual Check
  useEffect(() => {
    if (!lastResolved) return;

    const processResolution = async () => {
      const request = lastResolved;
      if (request.status === "APPROVED") {
        toast.success(`Sale approved by ${request.approver?.fullName || "Manager"}!`);
        if (request.type === "SALE_OVERRIDE") {
          localStorage.removeItem(STORAGE_KEY);
          toast.loading("Finalizing approved invoice...", { id: "p-auto-submit" });
          try {
            const finalResult = await dispatch(createSale({
              customerId,
              locationId: effectiveLocationId,
              globalDiscountValue: request.data?.globalDiscount?.value || 0,
              globalDiscountType: request.data?.globalDiscount?.type || "PERCENT",
              approvalRequestId: request.id,
            })).unwrap();
            toast.success(`Order finalized instantly! (${finalResult.sale.invoiceNumber})`, { id: "p-auto-submit" });
          } catch (err) { toast.error("Failed to auto-finalize. Please try manual complete.", { id: "p-auto-submit" }); }
        }
      } else if (request.status === "REJECTED") {
        toast.error(`❌ Manager REJECTED: "${request.note || "No specific reason provided"}"`, {
          duration: 8000,
          description: "Price override denied. Please adjust items to continue."
        });
      }
      // Cleanup to prevent double trigger
      dispatch(clearLastResolved());
    };

    processResolution();
  }, [lastResolved, dispatch, customerId, effectiveLocationId]);

  // Socket Listener: Simply dispatches to Redux
  const { on, off } = useSocket(`pos-${effectiveLocationId}`);
  useEffect(() => {
    const handleSocketResolved = (request) => {
      dispatch(removePendingRequest(request.id));
      dispatch(setLastResolved(request));
    };
    if (on) on(SOCKET_EVENTS.APPROVAL_RESOLVED, handleSocketResolved);
    return () => { if (off) off(SOCKET_EVENTS.APPROVAL_RESOLVED); };
  }, [on, off, dispatch]);

  // Load initial POS settings
  useEffect(() => {
    async function fetchInitialState() {
      try {
        const dashRes = await fetch("/api/tenant/dashboard");
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setTenant(dashData.tenant);
        }
        dispatch(fetchPendingRequests(effectiveLocationId));
      } catch (err) { console.error("POS state recovery error:", err); }
    }
    if (effectiveLocationId) fetchInitialState();
  }, [effectiveLocationId, dispatch]);

  useEffect(() => { if (catStatus === "idle") dispatch(fetchCategories()); }, [catStatus, dispatch]);

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      setProductsLoading(true);
      try {
        const params = new URLSearchParams();
        if (effectiveLocationId) params.set("locationId", effectiveLocationId);
        params.set("limit", "200");
        const res = await fetch(`/api/tenant/products?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setProducts((data.products || []).map((p) => ({ ...p, salePrice: Number(p.salePrice), costPrice: Number(p.costPrice || 0) })));
        }
      } catch (err) { console.error("POS product fetch error:", err); }
      finally { if (!cancelled) setProductsLoading(false); }
    }
    if (effectiveLocationId) fetchProducts();
    return () => { cancelled = true; };
  }, [effectiveLocationId]);

  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const stockSync = useRealTimeStock(productIds, true, effectiveLocationId);
  const handleAddToCart = (productId) => dispatch(addItem(productId));
  const changeQtyHandler = (productId, delta) => dispatch(changeQty({ productId, delta }));
  const handleSetItemDiscount = (productId, discountType, discountValue) => dispatch(setItemDiscount({ productId, discountType, discountValue }));

  const isSaleUnauthorized = useMemo(() => {
    if (user?.role !== "STAFF") return false;
    
    // Default limit is 15% unless specified in tenant settings
    const roleLimit = tenant?.settings?.discountLimits?.[user?.role] || 15;

    // 1. Check individual line reductions (price override + line discount)
    const hasLineOverrides = detailedCart.some(i => {
      const originalTotal = i.originalPrice * i.quantity;
      if (originalTotal <= 0) return false;
      const reduction = originalTotal - i.lineTotal;
      const reductionPercent = (reduction / originalTotal) * 100;
      return reductionPercent > roleLimit;
    });

    // 2. Check explicit global discount percentage
    const hasGlobalOverride = globalDiscountType === "PERCENT" && globalDiscountValue > roleLimit;

    // 3. Check cumulative total reduction (catches: 15% line + 15% global)
    const totalOriginalValue = detailedCart.reduce((sum, i) => sum + (i.originalPrice * i.quantity), 0);
    const cumulativeReduction = totalOriginalValue - total;
    const cumulativePercent = totalOriginalValue > 0 ? (cumulativeReduction / totalOriginalValue) * 100 : 0;
    const hasCumulativeOverride = cumulativePercent > roleLimit;
    
    return hasLineOverrides || hasGlobalOverride || hasCumulativeOverride;
  }, [detailedCart, globalDiscountValue, globalDiscountType, total, user, tenant]);

  const handleRequestSaleApproval = async (reason) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      const payload = {
        type: "SALE_OVERRIDE",
        locationId: effectiveLocationId,
        reason: reason || "Manager authorization requested.",
        data: {
          receiptSummary: { subtotal, total, discountAmount: subtotal - total, customerName: customer?.name || "Walk-in Customer" },
          items: detailedCart.map(i => ({ productId: i.productId, productName: i.product.name, originalPrice: i.originalPrice, customPrice: i.customPrice, discountType: i.discountType, discountValue: i.discountValue, quantity: i.quantity, lineTotal: i.lineTotal })),
          globalDiscount: { type: globalDiscountType, value: globalDiscountValue }
        }
      };
      await dispatch(createApprovalRequest(payload)).unwrap();
      toast.success("Detailed sale authorization request sent.");
    } catch (err) { toast.error(err || "Failed to send request."); }
  };

  const handleItemPriceChange = (productId, price) => dispatch(setItemPrice({ productId, customPrice: price }));
  const handleItemDiscountChange = (productId, discountType, discountValue) => dispatch(setItemDiscount({ productId, discountType, discountValue }));
  const handleGlobalDiscountChange = (type, value) => dispatch(setGlobalDiscount({ type, value }));

  const hideScrollbarStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <PosHeader effectiveLocationName={effectiveLocationName} isAllLocations={isAllLocations} />
      <div className="flex-1 min-h-0 container mx-auto w-full max-w-7xl px-4 py-4 grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        <section className="flex flex-col min-h-0">
          <CategoryChips categories={categories} selectedCategoryId={selectedCategoryId} setSelectedCategoryId={setSelectedCategoryId} hideScrollbarStyle={hideScrollbarStyle} />
          <ProductGrid products={products} productsLoading={productsLoading} selectedCategoryId={selectedCategoryId} selectedCategorySet={null} stockLevels={cartState.stockLevels} effectiveLocationId={effectiveLocationId} hideScrollbarStyle={hideScrollbarStyle} onAddToCart={handleAddToCart} />
        </section>
        <CartSidebar 
          detailedCart={detailedCart} customers={customers} customerId={customerId} 
          setCustomerId={(val) => dispatch(setCustomer(val))} changeQtyHandler={changeQtyHandler} 
          handleSetItemDiscount={handleSetItemDiscount} subtotal={subtotal} globalDiscountValue={globalDiscountValue} 
          setGlobalDiscountValue={(val) => dispatch(setGlobalDiscount({ value: val }))} globalDiscountType={globalDiscountType} 
          setGlobalDiscountType={(val) => dispatch(setGlobalDiscount({ type: val }))} handleGlobalDiscountChange={handleGlobalDiscountChange} 
          globalDiscountAmount={subtotal - total} total={total} handleSubmit={handleSubmit} cartLoading={cartLoading} 
          hideScrollbarStyle={hideScrollbarStyle} products={products} effectiveLocationId={effectiveLocationId} 
          pendingApprovals={pendingApprovals} user={user} handleRequestSaleApproval={handleRequestSaleApproval} 
          handleItemPriceChange={handleItemPriceChange} handleItemDiscountChange={handleItemDiscountChange} 
          isSaleUnauthorized={isSaleUnauthorized} tenant={tenant} setEditingItem={setEditingItem} editingItem={editingItem} 
          setIsGlobalDiscountOpen={setIsGlobalDiscountOpen} onRequestOpen={() => setIsRequestModalOpen(true)}
          pendingSaleRequest={pendingApprovals.find(r => r.type === "SALE_OVERRIDE" && r.status === "PENDING")} 
        />
      </div>
      <ProductEditModal isOpen={!!editingItem} item={editingItem} onClose={() => setEditingItem(null)} disabled={!!pendingApprovals.find(r => r.type === "SALE_OVERRIDE" && r.status === "PENDING")} onSave={(data) => { handleItemPriceChange(data.productId, data.price); handleItemDiscountChange(data.productId, data.discountType, data.discountValue); }} />
      <GlobalDiscountModal isOpen={isGlobalDiscountOpen} onClose={() => setIsGlobalDiscountOpen(false)} subtotal={subtotal} disabled={!!pendingApprovals.find(r => r.type === "SALE_OVERRIDE" && r.status === "PENDING")} currentValue={globalDiscountValue} currentType={globalDiscountType} onApply={(type, val) => handleGlobalDiscountChange(type, val)} />
      <RequestApprovalModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} subtotal={subtotal} total={total} onSend={handleRequestSaleApproval} />
    </div>
  );
}
