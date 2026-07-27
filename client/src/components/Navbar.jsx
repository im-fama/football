import { ShieldHalf, Search, Wifi, WifiOff } from "lucide-react";

export default function Navbar({ query, onQueryChange, onSubmit, apiOnline }) {
  return (
    <header className="sticky top-0 z-30 border-b border-pitch-700/60 bg-pitch-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <ShieldHalf className="h-7 w-7 text-brand-400" strokeWidth={2.2} />
          <div className="leading-none">
            <p className="font-display text-lg font-semibold tracking-wide text-white">
              PITCH<span className="text-brand-400">IQ</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-pitch-500">Analytics Platform</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="ml-auto flex flex-1 max-w-md items-center gap-2 rounded-lg border border-pitch-600 bg-pitch-900/80 px-3 py-2 focus-within:border-brand-500 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0 text-pitch-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search players by name..."
            className="w-full bg-transparent text-sm text-white placeholder:text-pitch-500 focus:outline-none"
          />
        </form>

        <div
          className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:flex ${
            apiOnline ? "bg-pulse-green/10 text-pulse-green" : "bg-pulse-red/10 text-pulse-red"
          }`}
          title={apiOnline ? "Live data connection" : "Upstream unreachable - showing cached/demo data"}
        >
          {apiOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {apiOnline ? "Live" : "Offline"}
        </div>
      </div>
    </header>
  );
}
