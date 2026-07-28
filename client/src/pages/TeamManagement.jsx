import { useState } from "react";
import { useTactics } from "../context/TacticsContext";
import { Plus, Edit2, Trash2, Save, X, AlertCircle, Upload } from "lucide-react";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"];
const ROLES = ["starter", "bench", "injured"];

function getFitnessColor(v) {
  if (!v && v !== 0) return "#37475a";
  if (v >= 80) return "#3ddc84";
  if (v >= 50) return "#f5b942";
  return "#ef5a5a";
}

let newPlayerIdCounter = 100;

const EMPTY_PLAYER = {
  name: "", initials: "", number: "", position: "CM", age: "",
  nationality: "", fitness: 85, stamina: 82, role: "bench",
  stats: { matches: 0, goals: 0, assists: 0, passAccuracy: 75, tackles: 0, interceptions: 0 },
  form: [], heatmapZones: [], instructions: {}, notes: "", avatar: null,
};

function PlayerRow({ player, onEdit, onDelete }) {
  const fc = getFitnessColor(player.fitness);
  const ROLE_COLORS = {
    starter: "#3ddc84", bench: "#4f8ff7", injured: "#ef5a5a", coach: "#d9b45f",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0.65rem 1rem", borderRadius: 10,
      background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
      transition: "background 0.2s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
    >
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${fc}`, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.08)", fontSize: "0.78rem",
        fontWeight: "700", color: "#fff", fontFamily: "'Oswald', sans-serif",
      }}>
        {player.avatar
          ? <img src={player.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : player.initials || player.name?.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "0.88rem" }}>{player.name}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          {player.position}
          {player.number ? ` · #${player.number}` : ""}
          {player.age ? ` · Age ${player.age}` : ""}
          {player.nationality ? ` · ${player.nationality}` : ""}
        </div>
      </div>

      {/* Role */}
      <div style={{
        padding: "2px 8px", borderRadius: 4, fontSize: "0.65rem", fontWeight: "700",
        color: ROLE_COLORS[player.role], background: `${ROLE_COLORS[player.role]}22`,
        letterSpacing: "0.06em", flexShrink: 0,
      }}>
        {player.role?.toUpperCase()}
      </div>

      {/* Fitness */}
      {player.fitness !== null && player.fitness !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width={36} height={36} style={{ position: "absolute" }}>
              <circle cx={18} cy={18} r={14} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
              <circle cx={18} cy={18} r={14} fill="none" stroke={fc} strokeWidth={3}
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - player.fitness / 100)}`}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
              />
            </svg>
            <span style={{ fontSize: "0.6rem", fontWeight: "700", color: fc, position: "relative", zIndex: 1 }}>{player.fitness}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button className="btn-icon" onClick={() => onEdit(player)} title="Edit player">
          <Edit2 size={13} />
        </button>
        <button className="btn-icon" onClick={() => onDelete(player.id)} title="Delete player"
          style={{ color: "#ef5a5a" }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function PlayerForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_PLAYER, ...initial });
  const [avatarPreview, setAvatarPreview] = useState(initial?.avatar || null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStat = (k, v) => setForm((f) => ({ ...f, stats: { ...(f.stats || {}), [k]: Number(v) } }));

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      set("avatar", ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      initials: form.initials || form.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
      number: form.number ? Number(form.number) : null,
      age: form.age ? Number(form.age) : null,
      fitness: Number(form.fitness),
      stamina: Number(form.stamina),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
      borderRadius: 14, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem",
    }}>
      <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1rem", color: "var(--text-primary)", margin: 0 }}>
        {initial?.id ? "Edit Player" : "Add New Player"}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Full Name *</label>
          <input className="input-field" required placeholder="e.g. Rafael Souza" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Initials</label>
          <input className="input-field" maxLength={2} placeholder="RS" value={form.initials} onChange={(e) => set("initials", e.target.value.toUpperCase())} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Position</label>
          <select className="input-field" value={form.position} onChange={(e) => set("position", e.target.value)}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Role</label>
          <select className="input-field" value={form.role} onChange={(e) => set("role", e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Jersey #</label>
          <input className="input-field" type="number" min={1} max={99} placeholder="9" value={form.number} onChange={(e) => set("number", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Age</label>
          <input className="input-field" type="number" min={15} max={45} placeholder="24" value={form.age} onChange={(e) => set("age", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nationality</label>
          <input className="input-field" placeholder="Italian" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Fitness ({form.fitness})</label>
          <input type="range" min={0} max={100} value={form.fitness} onChange={(e) => set("fitness", e.target.value)} style={{ width: "100%", accentColor: "#3ddc84" }} />
        </div>
      </div>

      {/* Avatar upload */}
      <div>
        <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Player Photo</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {avatarPreview && (
            <img src={avatarPreview} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-color)" }} />
          )}
          <label className="btn-secondary" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Upload size={13} /> Upload Photo
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <X size={13} /> Cancel
        </button>
        <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Save size={13} /> {initial?.id ? "Update" : "Add Player"}
        </button>
      </div>
    </form>
  );
}

export default function TeamManagement() {
  const { state, actions } = useTactics();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const allPlayers = [
    ...state.pitchPlayers,
    ...state.benchPlayers,
  ].filter((p) => p.role !== "coach");

  const filtered = allPlayers.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "ALL" || p.position === posFilter;
    const matchRole = roleFilter === "ALL" || p.role === roleFilter;
    return matchSearch && matchPos && matchRole;
  });

  const handleSave = (playerData) => {
    if (playerData.id) {
      actions.updatePlayer(playerData);
    } else {
      newPlayerIdCounter++;
      actions.addPlayer({ ...playerData, id: `new${newPlayerIdCounter}` });
    }
    setShowForm(false);
    setEditingPlayer(null);
  };

  const handleDelete = (id) => {
    actions.deletePlayer(id);
    setDeleteConfirm(null);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Summary stats
  const starters = allPlayers.filter((p) => p.role === "starter").length;
  const benchCount = allPlayers.filter((p) => p.role === "bench").length;
  const injured = allPlayers.filter((p) => p.role === "injured").length;
  const avgFitness = allPlayers.length
    ? Math.round(allPlayers.filter((p) => p.fitness).reduce((a, p) => a + p.fitness, 0) / allPlayers.filter((p) => p.fitness).length)
    : 0;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }} className="scrollbar-thin">
      {/* Page header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.8rem", color: "var(--text-primary)", margin: 0 }}>
            Team Management
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>
            Manage your squad, fitness, and player details
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingPlayer(null); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} /> Add Player
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "Total Squad", value: allPlayers.length, color: "#4f8ff7" },
          { label: "Starters",    value: starters,          color: "#3ddc84" },
          { label: "Bench",       value: benchCount,        color: "#d9b45f" },
          { label: "Injured",     value: injured,           color: "#ef5a5a" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: "800", fontFamily: "'Oswald', sans-serif", color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {(showForm || editingPlayer) && (
        <div style={{ marginBottom: "1.5rem" }}>
          <PlayerForm
            initial={editingPlayer || {}}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingPlayer(null); }}
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          className="input-field"
          placeholder="🔍 Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <select className="input-field" style={{ maxWidth: 140 }} value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
          <option value="ALL">All Positions</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input-field" style={{ maxWidth: 140 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="ALL">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>
          {filtered.length} player{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Player list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            No players match your filters.
          </div>
        )}
        {filtered.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteConfirm(id)}
          />
        ))}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ padding: "1.5rem", maxWidth: 360, width: "90%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={20} color="#ef5a5a" />
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1rem", color: "var(--text-primary)", margin: 0 }}>Delete Player?</h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              This will permanently remove the player from the squad.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
