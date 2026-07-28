import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Activity, BarChart2, Map, TrendingUp, Settings, FileText } from "lucide-react";
import { useTactics } from "../../context/TacticsContext";
import Heatmap from "../shared/Heatmap";
import FormGraph from "../shared/FormGraph";

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",      label: "Overview",     icon: Activity },
  { id: "stats",        label: "Stats",        icon: BarChart2 },
  { id: "heatmap",      label: "Heatmap",      icon: Map },
  { id: "performance",  label: "Performance",  icon: TrendingUp },
  { id: "instructions", label: "Instructions", icon: Settings },
  { id: "notes",        label: "Notes",        icon: FileText },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getFitnessColor(v) {
  if (v === null || v === undefined) return "#37475a";
  if (v >= 80) return "#3ddc84";
  if (v >= 50) return "#f5b942";
  return "#ef5a5a";
}

function RingMeter({ value, size = 72, strokeWidth = 5, color, label }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize={size * 0.22} fontWeight="700" fontFamily="Oswald">
          {value}
        </text>
      </svg>
      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

function StatBar({ label, value, max = 100, color = "#3ddc84" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: "0.55rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.6rem",
      textAlign: "center", border: "1px solid var(--border-color)",
    }}>
      <div style={{ fontSize: "1.3rem", fontWeight: "800", fontFamily: "'Oswald', sans-serif", color: color || "var(--text-primary)", lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

// ── TABS CONTENT ─────────────────────────────────────────────────────────────

function OverviewTab({ player }) {
  const fitnessColor = getFitnessColor(player.fitness);
  const staminaColor = getFitnessColor(player.stamina);
  const ROLE_BADGE_STYLES = {
    starter: { color: "#3ddc84", bg: "rgba(61,220,132,0.15)", label: "STARTER" },
    bench:   { color: "#4f8ff7", bg: "rgba(79,143,247,0.15)", label: "SUBSTITUTE" },
    injured: { color: "#ef5a5a", bg: "rgba(239,90,90,0.15)",  label: "INJURED" },
    coach:   { color: "#d9b45f", bg: "rgba(217,180,95,0.15)", label: "COACH" },
  };
  const role = ROLE_BADGE_STYLES[player.role] || ROLE_BADGE_STYLES.bench;

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Player identity */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
          border: `3px solid ${fitnessColor}`,
          background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.4rem", fontWeight: "700", color: "#fff",
          fontFamily: "'Oswald', sans-serif", overflow: "hidden",
          boxShadow: `0 0 20px ${fitnessColor}55`,
        }}>
          {player.avatar
            ? <img src={player.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            : player.initials}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.5rem", color: "#fff", margin: 0, lineHeight: 1 }}>
              {player.name}
            </h2>
            {player.number && (
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                #{player.number}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", fontSize: "0.72rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              {player.position}
            </span>
            <span style={{ padding: "2px 8px", borderRadius: 4, background: role.bg, fontSize: "0.72rem", fontWeight: "700", color: role.color, letterSpacing: "0.06em" }}>
              {role.label}
            </span>
            {player.nationality && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>🌍 {player.nationality}</span>
            )}
            {player.age && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Age {player.age}</span>
            )}
          </div>
        </div>
      </div>

      {/* Fitness meters */}
      {player.fitness !== null && player.fitness !== undefined && (
        <div>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Physical Condition
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <RingMeter value={player.fitness} color={fitnessColor} label="Fitness" />
            <RingMeter value={player.stamina} color={staminaColor} label="Stamina" />
            {player.stats?.matches !== undefined && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 120 }}>
                <StatBar label="Fitness" value={player.fitness} color={fitnessColor} />
                <StatBar label="Stamina" value={player.stamina} color={staminaColor} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coach info */}
      {player.role === "coach" && (
        <div style={{ padding: "0.75rem", borderRadius: 8, background: "rgba(217,180,95,0.08)", border: "1px solid rgba(217,180,95,0.2)" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
            {player.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function StatsTab({ player }) {
  if (!player.stats) {
    return <div style={{ padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No stats available</div>;
  }
  const s = player.stats;
  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Mini stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <MiniStatCard label="Matches"   value={s.matches}          color="#fff" />
        <MiniStatCard label="Goals"     value={s.goals}            color="#3ddc84" />
        <MiniStatCard label="Assists"   value={s.assists}          color="#4f8ff7" />
        <MiniStatCard label="Pass Acc." value={s.passAccuracy ? `${s.passAccuracy}%` : "—"} color="#d9b45f" />
      </div>

      {/* Stat bars */}
      <div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Detailed Metrics
        </div>
        {s.passAccuracy !== undefined && <StatBar label="Pass Accuracy" value={s.passAccuracy} max={100} color="#d9b45f" />}
        {s.tackles      !== undefined && <StatBar label="Tackles"       value={s.tackles}      max={100} color="#4f8ff7" />}
        {s.interceptions !== undefined && <StatBar label="Interceptions" value={s.interceptions} max={80} color="#a855f7" />}
        {s.saves         !== undefined && <StatBar label="Saves"         value={s.saves}         max={100} color="#3ddc84" />}
        {s.goals         !== undefined && <StatBar label="Goals"         value={s.goals}         max={30}  color="#3ddc84" />}
        {s.assists       !== undefined && <StatBar label="Assists"       value={s.assists}       max={20}  color="#4f8ff7" />}
        {s.minutes       !== undefined && <StatBar label="Minutes Played" value={s.minutes}      max={2700} color="#f5b942" />}
      </div>
    </div>
  );
}

function HeatmapTab({ player }) {
  return (
    <div style={{ padding: "1.25rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 180px", maxWidth: 220 }}>
        <Heatmap zones={player.heatmapZones || []} />
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Activity Zones
        </div>
        {(player.heatmapZones || []).map((z, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: `rgba(239,90,90,${z.intensity})`,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Zone {i + 1} — {Math.round(z.intensity * 100)}% intensity
              </div>
              <div className="stat-bar-track" style={{ marginTop: 3 }}>
                <div className="stat-bar-fill" style={{ width: `${z.intensity * 100}%`, background: `rgba(239,90,90,${z.intensity})` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceTab({ player }) {
  if (!player.form?.length) {
    return <div style={{ padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No performance data</div>;
  }

  const RESULT_LABELS = { W: "Win", D: "Draw", L: "Loss" };
  const RESULT_COLORS = { W: "#3ddc84", D: "#f5b942", L: "#ef5a5a" };

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Last 5 Matches — Form Trend
        </div>
        <FormGraph form={player.form} />
      </div>

      {/* Match list */}
      <div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Match Log
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[...player.form].reverse().map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0.45rem 0.6rem", borderRadius: 6,
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: RESULT_COLORS[m.result],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.62rem", fontWeight: "800", color: "#000",
              }}>
                {m.result}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: "600" }}>vs {m.opponent}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginLeft: 6 }}>({RESULT_LABELS[m.result]})</span>
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.85rem", fontWeight: "700",
                color: RESULT_COLORS[m.result],
              }}>
                {m.rating.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const INSTRUCTION_OPTIONS = {
  pressIntensity: { label: "Press Intensity", options: ["low", "medium", "high", "very high"] },
  defensive_line: { label: "Defensive Line", options: ["deep", "normal", "high"] },
};

const INSTRUCTION_TOGGLES = [
  { key: "stayForward", label: "Stay Forward" },
  { key: "stayBack",    label: "Stay Back" },
  { key: "overlap",     label: "Make Overlapping Runs" },
  { key: "cutInside",   label: "Cut Inside" },
  { key: "dribble",     label: "Take More Risks (Dribble)" },
  { key: "longShots",   label: "Attempt Long Shots" },
  { key: "markTightly", label: "Mark Tightly" },
  { key: "sweeper",     label: "Sweeper (GK)" },
];

function InstructionsTab({ player }) {
  const { actions } = useTactics();
  const inst = player.instructions || {};

  const update = (key, val) => {
    actions.updatePlayerInstructions(player.id, { ...inst, [key]: val });
  };

  if (player.role === "coach") {
    return <div style={{ padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No tactical instructions for coaching staff.</div>;
  }

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
        Tactical Instructions
      </div>

      {/* Dropdowns */}
      {Object.entries(INSTRUCTION_OPTIONS).map(([key, { label, options }]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{label}</label>
          <select
            className="input-field"
            style={{ width: "auto", minWidth: 120 }}
            value={inst[key] || options[1]}
            onChange={(e) => update(key, e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
            ))}
          </select>
        </div>
      ))}

      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Behaviour Toggles
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {INSTRUCTION_TOGGLES.map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "0.4rem", borderRadius: 6, background: inst[key] ? "rgba(61,220,132,0.08)" : "transparent", border: "1px solid", borderColor: inst[key] ? "rgba(61,220,132,0.25)" : "var(--border-color)", transition: "all 0.15s" }}>
              <div
                style={{
                  width: 32, height: 18, borderRadius: 9, flexShrink: 0, position: "relative", cursor: "pointer",
                  background: inst[key] ? "#3ddc84" : "rgba(255,255,255,0.1)",
                  transition: "background 0.2s",
                }}
                onClick={() => update(key, !inst[key])}
              >
                <div style={{
                  position: "absolute", top: 2, left: inst[key] ? 14 : 2, width: 14, height: 14,
                  borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s",
                }} />
              </div>
              <span style={{ fontSize: "0.73rem", color: inst[key] ? "#3ddc84" : "var(--text-secondary)" }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotesTab({ player }) {
  const { actions } = useTactics();
  const [notes, setNotes] = useState(player.notes || "");

  // Sync when player changes
  useEffect(() => { setNotes(player.notes || ""); }, [player.id, player.notes]);

  const save = () => actions.updatePlayerNotes(player.id, notes);

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Coach Notes
      </div>
      <textarea
        className="input-field scrollbar-thin"
        rows={8}
        style={{ resize: "vertical", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your tactical notes, observations, and instructions for this player…"
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn-secondary" onClick={() => setNotes(player.notes || "")}>Discard</button>
        <button className="btn-primary" onClick={save}>Save Notes</button>
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function PlayerModal({ player, defaultTab = "overview", onClose }) {
  const [activeTab, setActiveTab] = useState(defaultTab || "overview");

  // Get live player data from context so updates (notes, instructions) reflect immediately
  const { state } = useTactics();
  const livePlayer =
    state.pitchPlayers.find((p) => p.id === player.id) ||
    state.benchPlayers.find((p) => p.id === player.id) ||
    state.allPlayers.find((p) => p.id === player.id) ||
    player;

  const isCoach = livePlayer.role === "coach";

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content"
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.75rem 1rem 0 1rem",
            borderBottom: "1px solid var(--border-color)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{
                fontFamily: "'Oswald', sans-serif", fontSize: "0.9rem",
                fontWeight: "600", color: "var(--text-primary)",
              }}>
                {livePlayer.name}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                · {livePlayer.position}
              </span>
            </div>
            <button className="btn-icon" onClick={onClose} aria-label="Close modal" style={{ width: 28, height: 28 }}>
              <X size={14} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="tab-bar" style={{ paddingLeft: "0.5rem" }}>
            {TABS.filter((t) => !isCoach || t.id === "overview" || t.id === "notes").map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`tab-btn ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="scrollbar-thin" style={{ overflowY: "auto", flex: 1 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === "overview"     && <OverviewTab     player={livePlayer} />}
                {activeTab === "stats"        && <StatsTab        player={livePlayer} />}
                {activeTab === "heatmap"      && <HeatmapTab      player={livePlayer} />}
                {activeTab === "performance"  && <PerformanceTab  player={livePlayer} />}
                {activeTab === "instructions" && <InstructionsTab player={livePlayer} />}
                {activeTab === "notes"        && <NotesTab        player={livePlayer} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
