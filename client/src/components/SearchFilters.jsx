import { Filter } from "lucide-react";

const POSITIONS = ["ALL", "GK", "DEF", "MID", "FWD"];

export default function SearchFilters({
  leagues,
  selectedLeague,
  onLeagueChange,
  teams,
  selectedTeam,
  onTeamChange,
  position,
  onPositionChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-pitch-700/60 bg-pitch-900/50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-pitch-500">
        <Filter className="h-3.5 w-3.5" />
        Filters
      </div>

      <select
        value={selectedLeague}
        onChange={(e) => onLeagueChange(e.target.value)}
        className="rounded-md border border-pitch-600 bg-pitch-800 px-3 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none"
      >
        <option value="">Select league</option>
        {leagues.map((l) => (
          <option key={l.idLeague} value={l.strLeague}>
            {l.strLeague}
          </option>
        ))}
      </select>

      <select
        value={selectedTeam}
        onChange={(e) => onTeamChange(e.target.value)}
        disabled={!teams.length}
        className="rounded-md border border-pitch-600 bg-pitch-800 px-3 py-1.5 text-sm text-white focus:border-brand-500 focus:outline-none disabled:opacity-40"
      >
        <option value="">{teams.length ? "Select club" : "Choose a league first"}</option>
        {teams.map((t) => (
          <option key={t.idTeam} value={t.idTeam}>
            {t.strTeam}
          </option>
        ))}
      </select>

      <div className="ml-auto flex gap-1 rounded-md border border-pitch-600 bg-pitch-800 p-1">
        {POSITIONS.map((p) => (
          <button
            key={p}
            onClick={() => onPositionChange(p)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              position === p ? "bg-brand-500 text-pitch-950" : "text-pitch-500 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
