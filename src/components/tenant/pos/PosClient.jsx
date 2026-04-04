"use client";

import { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addItem, changeQty, setItemDiscount } from "@/store/cart/cartSlice";
import { createSale } from "@/store/cart/cartThunks";
import { fetchCategories } from "@/store/categories/categoryThunks";
import { toast } from "sonner";
import { useRealTimeStock } from "@/hooks/useRealTimeStock";
import { useActiveLocation } from "@/hooks/useActiveLocation";

// Modularized Components
import { PosHeader } from "./PosHeader";
import { CategoryChips } from "./CategoryChips";
import { ProductGrid } from "./ProductGrid";
import { CartSidebar } from "./CartSidebar";

export function PosClient({ customers, allLocations, user }) {
  const dispatch = useDispatch();
  
  // Redux Selectors
  const cartItems = useSelector((state) => state.cart.items);
  const cartLoading = useSelector((state) => state.cart.loading);
  const cartError = useSelector((state) => state.cart.error);
  const lastSale = useSelector((state) => state.cart.lastSale);
  const stockLevels = useSelector((state) => state.cart.stockLevels);
  const { items: categories, status: catStatus } = useSelector(
    (state) => state.categories
  );

  const { activeLocationId, activeLocationName, isAllLocations } =
    useActiveLocation();

  // Local States
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [customerId, setCustomerId] = useState("");
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState("PERCENT");

  // Fetch categories if not loaded
  useEffect(() => {
    if (catStatus === "idle") {
      dispatch(fetchCategories());
    }
  }, [catStatus, dispatch]);

  const effectiveLocationId = activeLocationId || allLocations?.[0]?.id;
  const effectiveLocationName = activeLocationId
    ? activeLocationName
    : allLocations?.[0]?.name || "Default";

  // Fetch products whenever effective location changes
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
          const mapped = (data.products || []).map((p) => ({
            ...p,
            salePrice: Number(p.salePrice),
            costPrice: Number(p.costPrice || 0),
          }));
          setProducts(mapped);
        }
      } catch (err) {
        console.error("POS product fetch error:", err);
        toast.error("Failed to fetch product catalog.");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }

    if (effectiveLocationId) {
      fetchProducts();
    }
    return () => {
      cancelled = true;
    };
  }, [effectiveLocationId]);

  // Compute descendant categories
  const selectedCategorySet = useMemo(() => {
    if (selectedCategoryId === "ALL") return null;
    const ids = new Set([selectedCategoryId]);
    let added = true;
    while (added) {
      added = false;
      for (const cat of categories) {
        if (cat.parentId && ids.has(cat.parentId) && !ids.has(cat.id)) {
          ids.add(cat.id);
          added = true;
        }
      }
    }
    return ids;
  }, [categories, selectedCategoryId]);

  // Real-time stock syncing
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const stockSync = useRealTimeStock(productIds, true, effectiveLocationId);

  // Cart Interactions
  function handleAddToCart(productId) {
    dispatch(addItem(productId));
  }

  function changeQtyHandler(productId, delta) {
    dispatch(changeQty({ productId, delta }));
  }

  function handleSetItemDiscount(productId, discountType, discountValue) {
    dispatch(setItemDiscount({ productId, discountType, discountValue }));
  }

  // Cart Computations
  const detailedCart = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const price = Number(product.salePrice);
        const lineTotalBeforeDiscount = price * item.quantity;
        
        let lineDiscountAmount = 0;
        if (item.discountValue > 0) {
          lineDiscountAmount =
            item.discountType === "PERCENT"
              ? lineTotalBeforeDiscount * (item.discountValue / 100)
              : item.discountValue;
        }
        
        // Ensure discount doesn't exceed line total
        lineDiscountAmount = Math.min(lineDiscountAmount, lineTotalBeforeDiscount);
        const lineTotal = lineTotalBeforeDiscount - lineDiscountAmount;

        return { ...item, product, price, lineTotalBeforeDiscount, lineDiscountAmount, lineTotal };
      })
      .filter((v) => v !== null);
  }, [cartItems, products]);

  const subtotal = detailedCart.reduce((sum, item) => sum + item.lineTotal, 0);
  const globalDiscountAmount =
    globalDiscountValue > 0
      ? globalDiscountType === "PERCENT"
        ? (subtotal * globalDiscountValue) / 100
        : globalDiscountValue
      : 0;
  
  // Ensure global discount doesn't exceed subtotal
  const safeGlobalDiscountAmount = Math.min(globalDiscountAmount, subtotal);
  const total = subtotal - safeGlobalDiscountAmount;

  // Sync: Reset global discount toggles when cart is completely cleared
  useEffect(() => {
    if (detailedCart.length === 0) {
      setGlobalDiscountValue(0);
      setGlobalDiscountType("PERCENT");
    }
  }, [detailedCart.length]);

  async function handleSubmit() {
    if (detailedCart.length === 0) {
      toast.error("Cart is empty. Add at least one item.");
      return;
    }
    if (cartLoading) return;
    try {
      const resultAction = await dispatch(
        createSale({
          customerId,
          globalDiscountValue,
          globalDiscountType,
          locationId: effectiveLocationId,
        })
      );
      if (createSale.fulfilled.match(resultAction)) {
        const sale = resultAction.payload.sale;
        setGlobalDiscountValue(0);
        setGlobalDiscountType("PERCENT");
        setCustomerId("");
        toast.success(`Sale ${sale.invoiceNumber} completed successfully!`);
        stockSync.refreshNow();
      } else {
        const errorMessage =
          resultAction.payload || resultAction.error?.message;
        toast.error(errorMessage || "Failed to complete sale.");
      }
    } catch {
      toast.error("Network error completing sale.");
    }
  }

  // Style helpers
  const hideScrollbarStyle = {
    msOverflowStyle: "none",
    scrollbarWidth: "none",
  };

  if (isAllLocations && !effectiveLocationId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="text-center rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-md">
          <h1 className="text-2xl font-bold mb-2">No Location Available</h1>
          <p className="text-slate-400">
            POS requires at least one location to operate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <PosHeader
        effectiveLocationName={effectiveLocationName}
        isAllLocations={isAllLocations}
      />

      {/* Main Grid: Catalog (left) and Cart (right) */}
      <div className="flex-1 min-h-0 container mx-auto w-full max-w-7xl px-4 py-4 grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        {/* Left Side: Product Catalog */}
        <section className="flex flex-col min-h-0 bg-transparent rounded-none border-none p-0">
          <CategoryChips
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            hideScrollbarStyle={hideScrollbarStyle}
          />

          <ProductGrid
            products={products}
            productsLoading={productsLoading}
            selectedCategoryId={selectedCategoryId}
            selectedCategorySet={selectedCategorySet}
            stockLevels={stockLevels}
            effectiveLocationId={effectiveLocationId}
            hideScrollbarStyle={hideScrollbarStyle}
            onAddToCart={handleAddToCart}
          />
        </section>

        {/* Right Side: Cart Viewer */}
        <CartSidebar
          detailedCart={detailedCart}
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          changeQtyHandler={changeQtyHandler}
          handleSetItemDiscount={handleSetItemDiscount}
          subtotal={subtotal}
          globalDiscountValue={globalDiscountValue}
          setGlobalDiscountValue={setGlobalDiscountValue}
          globalDiscountType={globalDiscountType}
          setGlobalDiscountType={setGlobalDiscountType}
          globalDiscountAmount={safeGlobalDiscountAmount}
          total={total}
          handleSubmit={handleSubmit}
          cartLoading={cartLoading}
          hideScrollbarStyle={hideScrollbarStyle}
          products={products}
          effectiveLocationId={effectiveLocationId}
        />
      </div>
    </div>
  );
}
