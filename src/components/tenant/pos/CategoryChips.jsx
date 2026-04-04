export function CategoryChips({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
}) {
  return (
    <div className="flex-none mb-4">
      <div
        className="flex gap-2 overflow-x-auto pb-2 items-center scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-sky-500/30"
      >
        <button
          onClick={() => setSelectedCategoryId("ALL")}
          className={`flex-none px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 ${
            selectedCategoryId === "ALL"
              ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] shadow-sky-500/20 border-transparent"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-slate-100 hover:bg-white/10"
          }`}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`flex-none px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 active:scale-95 ${
              selectedCategoryId === cat.id
                ? "bg-white text-slate-950 shadow-md shadow-white/10 border-transparent"
                : "bg-white/5 border border-white/10 text-slate-400 hover:text-slate-100 hover:bg-white/10"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
