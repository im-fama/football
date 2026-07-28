# taqtiq — Full Implementation Plan

A football decision-support and squad-management platform. The main screen
is an EA FC–style pitch: real player cards positioned in a formation,
swappable with a bench, with a coach's telestrator (pen + laser pointer) and
formation controls in a collapsible sidebar. Backed by MongoDB, with a
Flask ML microservice for ratings, form, and player-similarity insights.

---

## 1. Feature Specification (detailed)

### 1.1 Main screen — the Pitch View

This is the app's home screen, not a settings/dashboard page.

**Formation grid & swappable cards**
- The pitch renders as a vertical football field (goal at top, goal at
  bottom, center circle, penalty boxes — visually similar to the FC26
  squad screen you referenced).
- A formation (e.g. 4-3-3, 4-4-2, 3-5-2, 4-2-3-1) defines a fixed set of
  named slots (`GK`, `LB`, `CB1`, `CB2`, `RB`, `CDM`, `CM1`, `CM2`, `LW`,
  `ST`, `RW`, etc.), each with an `{x, y}` percentage position on the
  pitch.
- Each occupied slot shows a **FUT-style player card** (photo, rating,
  position badge, key stats on hover).
- **Swapping**: drag a card from the bench onto a pitch slot to substitute
  it in — the player who was there moves to the bench. Drag two pitch
  cards onto each other to swap their positions directly (e.g. swap your
  LW and RW). This uses `@hello-pangea/dnd`, so it's fully touch- and
  mouse-compatible, with a smooth animated swap rather than a jump-cut.
- Clicking (rather than dragging) a card opens the player detail modal —
  full stats, radar chart, ML-predicted rating/form, similar players —
  without leaving the pitch view.

**Search & load by league/team**
- A search panel (top bar, expandable) lets you pick a **league**, then a
  **team** within it, then hit **"Load Squad."**
- Loading a squad auto-populates the pitch: the best 11 by position fill
  the formation slots, everyone else lands on the bench.
- A free-text player search is also available here for finding an
  individual player across all loaded data, independent of the
  currently-loaded squad (used to scout/preview a player before deciding
  to swap them in).

**Bench**
- A horizontal strip below (or beside, on wide screens) the pitch showing
  every squad player not currently in the starting 11.
- Bench cards are the same draggable FUT-card component as pitch cards —
  visually smaller, but the same info and the same drag target.

**Drawing tools (telestrator)**
- A `DrawingLayer` — a transparent SVG/canvas overlay on top of the pitch
  — supports two distinct tools:
  - **Pen**: freehand strokes in a chosen color, used to draw tactical
    arrows, runs, marking assignments, etc. Persists until cleared or
    saved.
  - **Laser pen**: same freehand drawing, but each stroke automatically
    fades out and disappears ~1.5–2 seconds after you lift the pointer —
    for pointing something out live without cluttering the board
    permanently (mirrors a real laser pointer / telestrator highlight).
- An eraser tool and a **"Clear drawings"** button are available
  alongside the pen tools.
- A color picker lets you pick stroke color (useful for marking
  "attacking run" vs "defensive cover" in different colors).
- Drawings + the current lineup can be saved together as a **tactical
  board snapshot** (see Saved Plans/Users tab below), so a specific
  match-prep idea isn't lost when you navigate away.

**Formation options**
- A formation dropdown/selector (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2, ...).
- Switching formations re-maps your current 11 onto the new slot layout by
  closest-position match, rather than dumping everyone to the bench.

**Vertical sidebar (hidable)**
- Houses: formation selector, pen tool, laser pen tool, color picker,
  eraser, clear-drawings button, and a collapse toggle.
- Collapses to a slim icon rail (or fully hides) so the pitch can take the
  full screen width when you just want to look at the shape, then expands
  back out when you need the tools again. State persists across sessions
  (stored per-user, see §5 `users.preferences`).

### 1.2 Tab 2 — Team Stats

Season and match analytics for whichever team is currently loaded:
- Squad-wide stat leaderboards (top scorers, most assists, best pass
  accuracy, etc.), pulled from `player_season_stats`.
- Passing network and defensive heatmap visualizations, built from
  `match_events` coordinate data.
- Shot location / xG map for a selected match.
- Form trend chart (rating over the last N matches) per player.

### 1.3 Tab 3 — Scouting

Recruitment-focused tools, decoupled from any one team:
- **Explainable similar-player finder**: pick a player, get the ML
  service's top-5 KNN matches with a plain-English "why" (e.g. "+8% pass
  accuracy, similar defensive workrate").
- Multi-attribute filter search (position, age range, nationality,
  attribute-score sliders) across the full player pool.
- A **watchlist**: star players while browsing to save them here for
  later comparison, without affecting the current squad/pitch.
- Head-to-head card comparison (two FUT cards side by side with a
  shared radar chart).

### 1.4 Tab 4 — Users (account)

- Profile: name, email, role (`admin`/`coach`/`scout`).
- List of your saved tactical boards/plans, with quick-load back onto the
  pitch.
- Preferences: default league/team on load, sidebar collapsed/expanded
  default, theme.
- Logout / change password.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 (Vite), Tailwind CSS, Framer Motion, `@hello-pangea/dnd`, Recharts |
| Backend API | Node.js + Express |
| Database | **MongoDB** + Mongoose |
| ML microservice | Python + Flask + scikit-learn |
| Auth | JWT (`jsonwebtoken` + `bcrypt`) |
| Data source | TheSportsDB (free key `123`), pre-fetched into committed JSON fixtures (see §4) |

---

## 3. Architecture

```
┌───────────────┐      REST/JSON      ┌───────────────┐     REST/JSON     ┌─────────────────┐
│  React (Vite)  │  ───────────────▶  │  Express API   │  ─────────────▶  │  Flask ML         │
│  Pitch + Bench  │  ◀───────────────  │  + Mongoose    │  ◀─────────────  │  microservice     │
│  + sidebar tools│                    │  + JWT auth    │                   │  (rating/form/KNN)│
└───────────────┘                     └───────┬────────┘                   └─────────────────┘
                                               │
                                               ▼
                                        ┌───────────────┐
                                        │  MongoDB        │
                                        │  13 collections │
                                        └───────┬────────┘
                                               ▲
                                               │  one-shot bulk seed (insertMany, no live API on the critical path)
                                        ┌───────────────┐
                                        │  fixtures/*.json│  ← fetched once from TheSportsDB, committed to repo
                                        └───────────────┘
```

---

## 4. Database — 13 collections

| # | Collection | Key fields | Purpose |
|---|---|---|---|
| 1 | `users` | `email`, `passwordHash`, `role`, `preferences` (sidebar/theme/default league-team) | Accounts + the Users tab |
| 2 | `leagues` | `sourceId`, `name`, `country` | League list for the search panel |
| 3 | `teams` | `sourceId`, `leagueId` (ref), `name`, `badgeUrl`, `stadium`, `isCustom`, `createdBy` (ref) | Team list per league |
| 4 | `players` | `sourceId`, `teamId` (ref), `name`, `position`, `nationality`, `age`, `photoUrl`, `overallRating`, `isCustom`, `createdBy` (ref) | Core player records + FUT card data |
| 5 | `playerAttributes` | `playerId` (ref, unique) | `pace`, `shooting`, `passing`, `dribbling`, `defending`, `physical` — radar chart source |
| 6 | `playerSeasonStats` | `playerId` (ref), `seasonId` (ref), `matches`, `minutes`, `goals`, `assists`, `passAccuracy`, `tacklesP90`, `interceptionsP90`, `duelsWonPct` | Team Stats leaderboards + form history |
| 7 | `seasons` | `leagueId` (ref), `label` | Groups matches/stats |
| 8 | `matches` | `seasonId` (ref), `homeTeamId`, `awayTeamId`, `date`, `homeScore`, `awayScore` | Backing Team Stats analytics |
| 9 | `matchEvents` | `matchId` (ref), `playerId` (ref), `minute`, `type`, `x`, `y`, `details` (mixed) | Passing network / heatmap / shot map source data |
| 10 | `formations` | `name` (e.g. `"4-3-3"`), `slots` (array of `{code, x, y}`) | Powers the formation selector + slot layout |
| 11 | `tacticalBoards` | `userId` (ref), `title`, `formationId` (ref), `lineup` (array of `{slot, playerId}`), `drawings` (array of pen strokes), `notes`, `createdAt` | Saved pitch + bench + drawing snapshots, shown in the Users tab |
| 12 | `watchlist` | `userId` (ref), `playerId` (ref), `note`, `addedAt` | Scouting tab starred players |
| 13 | `playerSimilarityCache` | `playerId` (ref), `results` (mixed — cached KNN output + deltas), `computedAt` | Avoids re-hitting the ML service for repeat scouting lookups |

**Indexes**: unique `sourceId` on `teams`/`players`/`leagues` (upsert key
for seeding/caching), text index on `players.name` for search, compound
index on `playerSeasonStats` (`playerId`, `seasonId`).

**Why 13 collections instead of embedding everything in `players`:**
`playerAttributes` and `playerSeasonStats` are split out so that (a) season
stats have real per-season history instead of one blob that overwrites
itself on every re-fetch, and (b) the ML service can be handed a clean,
consistent feature vector without picking through a large nested player
document.

---

## 5. Bulk data loading — one command, every collection populated

Same philosophy as before, adapted to Mongo: **decouple fetching from
loading.**

```
database/
├── fixtures/
│   ├── leagues.json
│   ├── teams.json
│   ├── players.json
│   ├── playerAttributes.json
│   └── formations.json      (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2 presets)
└── seed.js
```

`scripts/fetch-fixtures.js` — run **once, by you** — pulls real
leagues/teams/rosters from TheSportsDB (key `123`) and writes normalized
JSON into `database/fixtures/`. This isolates the only network-dependent,
rate-limited step to a single re-runnable script instead of it being on the
path of every seed/deploy.

`database/seed.js` — run any time, fully offline, deterministic:

```js
import "dotenv/config";
import mongoose from "mongoose";
import { League, Team, Player, PlayerAttributes, Formation } from "../server/src/models/index.js";
import leagues from "./fixtures/leagues.json" assert { type: "json" };
import teams from "./fixtures/teams.json" assert { type: "json" };
import players from "./fixtures/players.json" assert { type: "json" };
import playerAttributes from "./fixtures/playerAttributes.json" assert { type: "json" };
import formations from "./fixtures/formations.json" assert { type: "json" };

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([
    League.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    PlayerAttributes.deleteMany({}),
    Formation.deleteMany({}),
  ]);

  await League.insertMany(leagues);
  await Team.insertMany(teams);
  await Player.insertMany(players);
  await PlayerAttributes.insertMany(playerAttributes);
  await Formation.insertMany(formations);

  console.log(
    `[seed] loaded ${leagues.length} leagues, ${teams.length} teams, ` +
    `${players.length} players, ${formations.length} formations.`
  );
  await mongoose.disconnect();
}

seed();
```

```bash
npm run seed     # one command, populates leagues/teams/players/attributes/formations in one run
```

Open MongoDB Compass afterward and every collection has real documents —
no clicking through the UI first to make data appear. `matches`,
`matchEvents`, `playerSeasonStats`, `users`, `tacticalBoards`,
`watchlist`, and `playerSimilarityCache` start empty and fill in through
normal use (creating an account, saving a board, playing matches through
the analytics pipeline) since those are inherently user- and
session-generated, not bulk-loadable reference data.

---

## 6. Backend API

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me
  PUT    /api/auth/preferences        sidebar state, default league/team, theme

Leagues / Teams
  GET    /api/leagues
  GET    /api/leagues/:id/teams

Players
  GET    /api/players?team=&position=&q=
  GET    /api/players/:id             (includes attributes + latest season stats)
  GET    /api/players/:id/insights    → proxies Flask: predicted rating + form
  GET    /api/players/:id/similar     → proxies Flask: KNN, cached in playerSimilarityCache

Formations
  GET    /api/formations              list of presets for the sidebar selector

Squad loading (main pitch view)
  GET    /api/teams/:teamId/squad     returns players auto-assigned to an 11 + bench, given a formation

Tactical Boards (save/load pitch + bench + drawings)
  GET    /api/boards
  GET    /api/boards/:id
  POST   /api/boards
  PUT    /api/boards/:id
  DELETE /api/boards/:id

Team Stats
  GET    /api/teams/:id/leaderboards
  GET    /api/matches/:id/passing-network
  GET    /api/matches/:id/heatmap

Scouting
  GET    /api/watchlist
  POST   /api/watchlist
  DELETE /api/watchlist/:playerId
```

---

## 7. Frontend structure

```
src/
├── pages/
│   ├── PitchView.jsx          ← MAIN PAGE
│   ├── TeamStats.jsx
│   ├── Scouting.jsx
│   └── Account.jsx
├── components/
│   ├── pitch/
│   │   ├── FormationGrid.jsx     renders slots for the active formation
│   │   ├── PitchCard.jsx         draggable FUT card, on-pitch
│   │   ├── BenchRail.jsx         draggable FUT card strip, off-pitch
│   │   ├── DrawingLayer.jsx      SVG overlay: pen + laser-pen strokes
│   │   └── SquadLoader.jsx       league → team → "Load Squad" search panel
│   ├── sidebar/
│   │   ├── VerticalSidebar.jsx   collapsible container
│   │   ├── FormationSelect.jsx
│   │   ├── PenTool.jsx
│   │   ├── LaserPenTool.jsx
│   │   ├── ColorPicker.jsx
│   │   └── ClearDrawingsButton.jsx
│   ├── FutCard.jsx
│   ├── PlayerModal.jsx
│   ├── StatRadar.jsx
│   └── StatBar.jsx
├── context/
│   └── SquadContext.jsx        { formation, starters: {slot: player}, bench: [player], drawings: [] }
└── services/
    └── api.js
```

**Drag-and-drop**: `SquadContext` holds the live pitch/bench state.
`@hello-pangea/dnd`'s `<DragDropContext onDragEnd>` handles both bench→pitch
substitutions and pitch↔pitch swaps by comparing source/destination
droppable IDs. Saving a tactical board serializes the current
`SquadContext` state (formation + lineup + drawings) to `POST /api/boards`.

**Drawing layer**: pointer-down starts a new stroke `{tool, color, points:
[]}`; pointer-move appends points; pointer-up finalizes it. If `tool ===
"laser"`, a `setTimeout` fades the stroke's opacity to 0 over ~400ms
starting 1.5s after pointer-up, then removes it from state. If `tool ===
"pen"`, the stroke stays until "Clear drawings" is pressed or the board is
saved/reloaded with a different snapshot.

---

## 8. ML Microservice

| Endpoint | Model | Purpose |
|---|---|---|
| `POST /predict/rating` | GradientBoostingRegressor | Predicted overall rating shown in the player modal |
| `POST /predict/form` | RandomForestClassifier | In Form / Average / Declining badge |
| `POST /similarity` | KNN + StandardScaler | Scouting tab's similar-player finder, with per-feature deltas |

Trained on a synthetic-but-realistic dataset at build time
(`train_model.py`), so it works immediately without needing labeled
real-world training data, and is refined later as real
`playerSeasonStats` accumulates.

---

## 9. Auth & Roles

- **Admin** — full CRUD everywhere, including deleting custom teams/players.
- **Coach** — full CRUD on tactical boards, custom players/teams; read
  everything else.
- **Scout** — read-only on squads; full access to the Scouting tab and
  their own watchlist/boards.

League/team/player browsing and the pitch view are usable without login;
saving a tactical board, using the watchlist, and the Users tab require an
account.

---

## 10. Phased Roadmap

### Phase 1 — Schema & bulk seed (2–3 days)
- [ ] Define all 13 Mongoose schemas + indexes
- [ ] `scripts/fetch-fixtures.js` — one-time real-data pull from TheSportsDB
- [ ] `database/seed.js` — one-command bulk load, verified in Compass

### Phase 2 — Core API (3–4 days)
- [ ] Leagues/teams/players CRUD + squad-loading endpoint
- [ ] Formations endpoint + preset fixtures
- [ ] Flask service: rating/form/similarity, wired end-to-end

### Phase 3 — Pitch main screen (1–1.5 weeks)
- [ ] `FormationGrid` + `PitchCard` + `BenchRail` with drag-and-drop swap
- [ ] `SquadLoader` (league → team → load)
- [ ] `VerticalSidebar` with collapse/expand + formation selector
- [ ] `DrawingLayer`: pen tool + laser pen (auto-fade) + eraser + clear + color picker

### Phase 4 — Auth + Users tab + Tactical Boards (4–5 days)
- [ ] JWT auth, `requireRole` middleware
- [ ] Save/load tactical boards (lineup + drawings + notes)
- [ ] Users tab: profile, saved boards list, preferences

### Phase 5 — Team Stats + Scouting (1 week)
- [ ] `matchEvents` ingestion + passing network/heatmap views
- [ ] Season leaderboards from `playerSeasonStats`
- [ ] Scouting tab: KNN finder UI, attribute-slider filters, watchlist, head-to-head compare

---

## 11. Renaming checklist (→ taqtiq)

- [ ] Root folder: `taqtiq/`
- [ ] `package.json` `name` fields in `client/`, `server/`, `ml-service/`
- [ ] App title in `index.html`, navbar/logo text
- [ ] `MONGO_URI` database name → `taqtiq`
- [ ] `README.md` title and repo references
- [ ] Docker Compose service/container names (`taqtiq-server`,
      `taqtiq-client`, `taqtiq-ml`, `taqtiq-mongo`)
