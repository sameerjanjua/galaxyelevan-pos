import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  productsLoading,
  selectedCategoryId,
  selectedCategorySet,
  stockLevels,
  effectiveLocationId,
  hideScrollbarStyle,
  onAddToCart,
}) {
  return (
    <div
      className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-sky-500/30"
    >
      {productsLoading ? (
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <p className="text-slate-400 text-sm">No products found.</p>
          <p className="text-slate-600 text-xs mt-1">
            Add items in the dashboard to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
          {products
            .filter(
              (p) =>
                selectedCategoryId === "ALL" ||
                (selectedCategorySet && selectedCategorySet.has(p.categoryId))
            )
            .map((product) => {
              const realtimeStockInfo = stockLevels[product.id];

              let quantity = 0;
              let alertThreshold = product.lowStockAlert;
              let trackStock = product.trackStock;

              if (realtimeStockInfo) {
                quantity = realtimeStockInfo.totalStock ?? 0;
                alertThreshold =
                  realtimeStockInfo.lowStockAlert ?? product.lowStockAlert;
                trackStock = realtimeStockInfo.trackStock ?? product.trackStock;
              } else {
                const locationStock =
                  product.stocks?.find(
                    (s) => s.locationId === effectiveLocationId
                  ) || product.stocks?.[0];
                quantity = locationStock?.quantity ?? 0;
                if (locationStock?.minQuantity > 0) {
                  alertThreshold = locationStock.minQuantity;
                }
              }

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantity}
                  alertThreshold={alertThreshold}
                  trackStock={trackStock}
                  onAddToCart={onAddToCart}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
