"""
statsbomb_service.py — Phase 3: StatsBomb Tactical Research Lab

Uses the official statsbombpy library to pull open-access event data
for historical tournaments (World Cups, Euros, La Liga seasons).

Core capabilities:
  1. List available competitions & matches from the open dataset
  2. Isolate tracking events where event_type == 'Pass'
  3. Extract origin coordinates (x, y) and destination (end_x, end_y)
  4. Compute passing network metrics:
     - Passer/Receiver pair counts
     - Average player locations
     - Line-thickness vectors representing team chemistry
  5. Extract pressure event maps for player positioning analysis

Endpoints wired through app.py:
  GET  /statsbomb/competitions
  GET  /statsbomb/matches?competition_id=X&season_id=Y
  POST /statsbomb/passing-network   { "match_id": 3788741 }
  POST /statsbomb/pressure-map      { "match_id": 3788741, "team": "..." }
"""

import traceback
from collections import defaultdict

try:
    from statsbombpy import sb
    STATSBOMB_AVAILABLE = True
except ImportError:
    STATSBOMB_AVAILABLE = False
    print("[StatsBomb] statsbombpy not installed. Run: pip install statsbombpy")


# ─── Highlighted open-access competitions ────────────────────────────
FEATURED_COMPETITIONS = [
    {"competition_id": 43, "season_id": 106, "name": "FIFA World Cup 2022", "country": "International"},
    {"competition_id": 43, "season_id": 3,   "name": "FIFA World Cup 2018", "country": "International"},
    {"competition_id": 55, "season_id": 43,  "name": "UEFA Euro 2020",      "country": "Europe"},
    {"competition_id": 11, "season_id": 90,  "name": "La Liga 2020/21",     "country": "Spain"},
    {"competition_id": 11, "season_id": 42,  "name": "La Liga 2019/20",     "country": "Spain"},
    {"competition_id": 72, "season_id": 30,  "name": "NWSL 2018",           "country": "USA"},
    {"competition_id": 37, "season_id": 90,  "name": "FA WSL 2020/21",      "country": "England"},
    {"competition_id": 2,  "season_id": 44,  "name": "Champions League 2003/04", "country": "Europe"},
]


def get_competitions():
    """
    List available StatsBomb open-access competitions.
    Returns featured competitions plus any additional available ones.
    """
    if not STATSBOMB_AVAILABLE:
        return {"competitions": FEATURED_COMPETITIONS, "source": "featured_list"}

    try:
        comps = sb.competitions()
        comp_list = []
        for _, row in comps.iterrows():
            comp_list.append({
                "competition_id": int(row["competition_id"]),
                "season_id": int(row["season_id"]),
                "name": f"{row['competition_name']} {row['season_name']}",
                "country": row.get("country_name", ""),
            })
        return {"competitions": comp_list, "source": "statsbombpy_live"}
    except Exception as e:
        print(f"[StatsBomb] Error fetching competitions: {e}")
        return {"competitions": FEATURED_COMPETITIONS, "source": "featured_fallback"}


def get_matches(competition_id, season_id):
    """
    List matches for a given competition and season.
    """
    if not STATSBOMB_AVAILABLE:
        return {"matches": [], "error": "statsbombpy not installed"}

    try:
        matches = sb.matches(competition_id=competition_id, season_id=season_id)
        match_list = []
        for _, row in matches.iterrows():
            match_list.append({
                "match_id": int(row["match_id"]),
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "home_score": int(row.get("home_score", 0)),
                "away_score": int(row.get("away_score", 0)),
                "match_date": str(row.get("match_date", "")),
                "competition_stage": row.get("competition_stage", ""),
            })
        return {"matches": match_list}
    except Exception as e:
        print(f"[StatsBomb] Error fetching matches: {e}")
        return {"matches": [], "error": str(e)}


def get_passing_network(match_id, team_name=None):
    """
    Deep tactical passing network analysis for a match.

    Isolates events where event_type == 'Pass' and extracts:
      - Origin coordinates (x, y)
      - Destination coordinates (end_x, end_y)
      - Passer/receiver pair counts (line-thickness / chemistry vectors)
      - Average player locations for node positioning

    Returns {
      nodes: [{ player, position, x, y, pass_count }],
      edges: [{ from_player, to_player, count, avg_x1, avg_y1, avg_x2, avg_y2 }],
      stats: { total_passes, completion_rate, ... }
    }
    """
    if not STATSBOMB_AVAILABLE:
        return _fallback_passing_network(match_id)

    try:
        events = sb.events(match_id=match_id)

        # Step 1: Isolate tracking events where event_type == 'Pass'
        passes = events[events["type"] == "Pass"].copy()

        if team_name:
            passes = passes[passes["team"] == team_name]

        if passes.empty:
            # If no team specified, try first team in data
            teams = events["team"].unique()
            if len(teams) > 0:
                passes = events[(events["type"] == "Pass") & (events["team"] == teams[0])]
                team_name = teams[0]

        if passes.empty:
            return _fallback_passing_network(match_id)

        # Step 2: Extract origin (x, y) and destination (end_x, end_y)
        pass_data = []
        for _, row in passes.iterrows():
            loc = row.get("location", [0, 0])
            end_loc = row.get("pass_end_location", [0, 0])

            if not isinstance(loc, (list, tuple)) or len(loc) < 2:
                continue
            if not isinstance(end_loc, (list, tuple)) or len(end_loc) < 2:
                continue

            pass_data.append({
                "player": row.get("player", "Unknown"),
                "recipient": row.get("pass_recipient", "Unknown"),
                "x": float(loc[0]),
                "y": float(loc[1]),
                "end_x": float(end_loc[0]),
                "end_y": float(end_loc[1]),
                "outcome": row.get("pass_outcome", "Complete"),
                "length": float(row.get("pass_length", 0)),
            })

        if not pass_data:
            return _fallback_passing_network(match_id)

        # Step 3: Compute average locations per player (node positions)
        player_locations = defaultdict(lambda: {"x_sum": 0, "y_sum": 0, "count": 0})
        for p in pass_data:
            player_locations[p["player"]]["x_sum"] += p["x"]
            player_locations[p["player"]]["y_sum"] += p["y"]
            player_locations[p["player"]]["count"] += 1

        nodes = []
        for player, loc in player_locations.items():
            if loc["count"] >= 2:  # Filter out subs with very few touches
                avg_x = loc["x_sum"] / loc["count"]
                avg_y = loc["y_sum"] / loc["count"]
                nodes.append({
                    "player": str(player),
                    "x": round(avg_x * 100 / 120, 1),  # Normalize StatsBomb 120x80 → 0-100
                    "y": round(avg_y * 100 / 80, 1),
                    "pass_count": loc["count"],
                })

        # Step 4: Compute passer/receiver pair counts (chemistry line-thickness vectors)
        pair_counts = defaultdict(lambda: {
            "count": 0, "x1_sum": 0, "y1_sum": 0, "x2_sum": 0, "y2_sum": 0
        })

        for p in pass_data:
            if p["recipient"] and str(p["recipient"]) != "Unknown":
                key = (str(p["player"]), str(p["recipient"]))
                pair_counts[key]["count"] += 1
                pair_counts[key]["x1_sum"] += p["x"]
                pair_counts[key]["y1_sum"] += p["y"]
                pair_counts[key]["x2_sum"] += p["end_x"]
                pair_counts[key]["y2_sum"] += p["end_y"]

        edges = []
        for (from_p, to_p), data in pair_counts.items():
            if data["count"] >= 2:  # Minimum 2 passes for a meaningful link
                edges.append({
                    "from_player": from_p,
                    "to_player": to_p,
                    "count": data["count"],
                    # Normalized average coordinates for vector plotting
                    "avg_x1": round((data["x1_sum"] / data["count"]) * 100 / 120, 1),
                    "avg_y1": round((data["y1_sum"] / data["count"]) * 100 / 80, 1),
                    "avg_x2": round((data["x2_sum"] / data["count"]) * 100 / 120, 1),
                    "avg_y2": round((data["y2_sum"] / data["count"]) * 100 / 80, 1),
                })

        # Sort edges by count descending for line-thickness rendering
        edges.sort(key=lambda e: e["count"], reverse=True)

        # Stats summary
        total = len(pass_data)
        completed = sum(1 for p in pass_data if p["outcome"] in ("Complete", None, ""))
        avg_length = sum(p["length"] for p in pass_data) / max(total, 1)

        return {
            "team": team_name or "Unknown",
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_passes": total,
                "completed": completed,
                "completion_rate": round(completed / max(total, 1) * 100, 1),
                "average_pass_length": round(avg_length, 1),
                "unique_passers": len(nodes),
                "strongest_link": edges[0] if edges else None,
            },
            "source": "statsbomb_open_data",
        }

    except Exception as e:
        print(f"[StatsBomb] Passing network error: {e}")
        traceback.print_exc()
        return _fallback_passing_network(match_id)


def get_pressure_map(match_id, team_name=None):
    """
    Extract pressure event positions for player positioning analysis.
    Returns coordinates where pressing actions occurred.
    """
    if not STATSBOMB_AVAILABLE:
        return {"zones": [], "error": "statsbombpy not installed"}

    try:
        events = sb.events(match_id=match_id)
        pressure = events[events["type"] == "Pressure"].copy()

        if team_name:
            pressure = pressure[pressure["team"] == team_name]

        zones = []
        for _, row in pressure.iterrows():
            loc = row.get("location", [0, 0])
            if isinstance(loc, (list, tuple)) and len(loc) >= 2:
                zones.append({
                    "x": round(float(loc[0]) * 100 / 120, 1),
                    "y": round(float(loc[1]) * 100 / 80, 1),
                    "player": str(row.get("player", "Unknown")),
                    "minute": int(row.get("minute", 0)),
                })

        return {
            "team": team_name or "Unknown",
            "zones": zones,
            "total_pressures": len(zones),
            "source": "statsbomb_open_data",
        }
    except Exception as e:
        print(f"[StatsBomb] Pressure map error: {e}")
        return {"zones": [], "error": str(e)}


# ─── Fallback passing network (when StatsBomb unavailable) ───────────

def _fallback_passing_network(match_id):
    """
    Returns a realistic mock passing network for demonstration.
    Uses deterministic generation so the same match_id always gives the same result.
    """
    import hashlib
    h = int(hashlib.md5(str(match_id).encode()).hexdigest()[:8], 16)

    def _r():
        nonlocal h
        h = (h * 1103515245 + 12345) & 0x7FFFFFFF
        return (h >> 16) / 32768.0

    players = [
        {"player": "Goalkeeper",  "x": 8,  "y": 50, "pass_count": 28},
        {"player": "Left Back",   "x": 25, "y": 18, "pass_count": 45},
        {"player": "Center Back 1", "x": 22, "y": 38, "pass_count": 52},
        {"player": "Center Back 2", "x": 22, "y": 62, "pass_count": 48},
        {"player": "Right Back",  "x": 25, "y": 82, "pass_count": 42},
        {"player": "Left Mid",    "x": 48, "y": 15, "pass_count": 55},
        {"player": "Central Mid", "x": 45, "y": 50, "pass_count": 72},
        {"player": "Right Mid",   "x": 48, "y": 85, "pass_count": 51},
        {"player": "Left Wing",   "x": 72, "y": 12, "pass_count": 38},
        {"player": "Striker",     "x": 78, "y": 50, "pass_count": 35},
        {"player": "Right Wing",  "x": 72, "y": 88, "pass_count": 40},
    ]

    # Add some randomness to positions
    for p in players:
        p["x"] = round(p["x"] + (_r() - 0.5) * 8, 1)
        p["y"] = round(p["y"] + (_r() - 0.5) * 8, 1)
        p["pass_count"] = max(10, p["pass_count"] + int((_r() - 0.5) * 20))

    edges = [
        {"from_player": "Goalkeeper", "to_player": "Center Back 1", "count": 14},
        {"from_player": "Goalkeeper", "to_player": "Center Back 2", "count": 12},
        {"from_player": "Center Back 1", "to_player": "Central Mid", "count": 22},
        {"from_player": "Center Back 2", "to_player": "Central Mid", "count": 19},
        {"from_player": "Left Back", "to_player": "Left Mid", "count": 18},
        {"from_player": "Right Back", "to_player": "Right Mid", "count": 16},
        {"from_player": "Central Mid", "to_player": "Striker", "count": 28},
        {"from_player": "Central Mid", "to_player": "Left Wing", "count": 15},
        {"from_player": "Central Mid", "to_player": "Right Wing", "count": 14},
        {"from_player": "Left Mid", "to_player": "Left Wing", "count": 20},
        {"from_player": "Right Mid", "to_player": "Right Wing", "count": 18},
        {"from_player": "Left Wing", "to_player": "Striker", "count": 12},
        {"from_player": "Right Wing", "to_player": "Striker", "count": 11},
        {"from_player": "Central Mid", "to_player": "Left Mid", "count": 16},
        {"from_player": "Central Mid", "to_player": "Right Mid", "count": 15},
    ]

    # Add avg coordinates to edges from player nodes
    player_map = {p["player"]: p for p in players}
    for edge in edges:
        f = player_map.get(edge["from_player"], {"x": 50, "y": 50})
        t = player_map.get(edge["to_player"], {"x": 50, "y": 50})
        edge["avg_x1"] = f["x"]
        edge["avg_y1"] = f["y"]
        edge["avg_x2"] = t["x"]
        edge["avg_y2"] = t["y"]
        edge["count"] = max(5, edge["count"] + int((_r() - 0.5) * 10))

    edges.sort(key=lambda e: e["count"], reverse=True)

    total = sum(p["pass_count"] for p in players)

    return {
        "team": "Demo Team",
        "nodes": players,
        "edges": edges,
        "stats": {
            "total_passes": total,
            "completed": int(total * 0.84),
            "completion_rate": 84.0,
            "average_pass_length": 18.5,
            "unique_passers": 11,
            "strongest_link": edges[0] if edges else None,
        },
        "source": "generated_fallback",
    }


# ─── CLI Test ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json

    print("=" * 60)
    print("  StatsBomb Service Test")
    print("=" * 60)

    print(f"\nstatsbombpy available: {STATSBOMB_AVAILABLE}")

    print("\n1. Competitions:")
    comps = get_competitions()
    print(f"   Source: {comps['source']}")
    print(f"   Count: {len(comps['competitions'])}")
    for c in comps["competitions"][:5]:
        print(f"   - {c['name']} ({c['country']})")

    print("\n2. Passing Network (fallback):")
    network = get_passing_network("test_match")
    print(f"   Source: {network['source']}")
    print(f"   Nodes: {len(network['nodes'])}")
    print(f"   Edges: {len(network['edges'])}")
    print(f"   Stats: {json.dumps(network['stats'], indent=4)}")

    if STATSBOMB_AVAILABLE:
        print("\n3. Live StatsBomb data test (World Cup 2022 Final):")
        try:
            live = get_passing_network(3869685, team_name="Argentina")
            print(f"   Source: {live['source']}")
            print(f"   Team: {live['team']}")
            print(f"   Nodes: {len(live['nodes'])}")
            print(f"   Total passes: {live['stats']['total_passes']}")
        except Exception as e:
            print(f"   Error: {e}")
