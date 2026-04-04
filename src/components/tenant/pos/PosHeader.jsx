export function PosHeader({ effectiveLocationName, isAllLocations }) {
  return (
    <header className="flex-none px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10">
      <div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
          Nova POS
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-semibold text-sky-400/90 tracking-wide">
            {effectiveLocationName}
          </span>
          {isAllLocations && (
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400">
              Auto
            </span>
          )}
          <span className="text-[10px] text-slate-500 flex items-center gap-1 before:content-[''] before:w-1 before:h-1 before:bg-green-500 before:rounded-full before:animate-pulse ml-2">
            Syncing
          </span>
        </div>
      </div>
      <a
        href="/dashboard"
        className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all active:scale-95"
      >
        Exit POS
      </a>
    </header>
  );
}
