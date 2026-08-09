# taqtiq — Football Decision Platform

**taqtiq** is a full-stack football decision support and squad management platform featuring an EA FC–style interactive pitch view with FUT cards, drag-and-drop squad management, a coach's telestrator drawing layer, team analytics, explainable scouting, and JWT authentication.

```
┌─────────────────┐       REST/JSON      ┌─────────────────┐      REST/JSON     ┌──────────────────┐
│  React (Vite)   │  ─────────────────▶  │   Express API   │  ────────────────▶ │     Flask ML     │
│  Pitch + Bench  │  ◀─────────────────  │   + Mongoose    │  ◀──────────────── │   microservice   │
│  + Telestrator  │        :5173         │   + JWT auth    │       :5001        │  (rating/form)   │
└─────────────────┘                      └────────┬────────┘                    └──────────────────┘
                                              :5000  │
                                                  ▼
                                           ┌──────────────┐        ┌──────────────────────┐
                                           │   MongoDB    │ ◀───── │  EA FC CSV dumps     │
                                           │ 13 Mongoose  │  auto- │  ./database/*.csv    │
                                           │ collections  │  load  │  ~20k players        │
                                           └──────────────┘        └──────────────────────┘
```

---

## 🚀 Quick Start (TL;DR)

```bash
npm run setup     # install every workspace's dependencies
npm run dev       # start the API (:5000) and the client (:5173) together
```

Open **http://localhost:5173**. On the very first run the API loads ~20k players
from the CSV dumps in `./database` — the app shows a progress screen while that
happens (~30 s) and then drops you straight onto the pitch. **There is no manual
seed step.** Every start after that is instant.

Log in from the avatar menu in the header with `coach@taqtiq.com` / `password123`.

---

## 🌟 Key Features

- **EA FC-Style Pitch View**: Interactive tactical pitch with draggable FUT-style player cards remappable by formation (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2, 3-4-3, 4-5-1, 4-3-2-1, 4-1-2-1-2, plus a free-placement Custom mode).
- **Real squads, auto-assigned**: Every club's XI is picked from its actual roster by positional fit, with the club's real manager on the bench.
- **Drag-and-Drop Squad Management**: Powered by `@hello-pangea/dnd` for animated bench↔pitch substitutions and pitch↔pitch player swaps.
- **Coach Telestrator Drawing Layer**: Transparent SVG overlay supporting:
  - **Pen**: Persistent tactical drawing (runs, marking, arrows).
  - **Laser Pen**: Auto-fading strokes that disappear ~1.5 s after lifting the pointer.
  - **Colour picker** and **Clear Drawings**.
- **Team Analytics Dossier**: Season leaderboards (goals, assists, pass accuracy, tackles/90), passing network diagrams, defensive heatmaps and shot maps built from match coordinate events — available for every club.
- **Explainable Scouting**: Name + position search across the whole pool, KNN similarity engine with per-feature delta explanations, starred watchlist, and side-by-side head-to-head comparison.
- **AI Tactics**: Formation- and squad-aware tactical suggestions from the Flask service.
- **Creator Studio**: Build custom players and clubs, or search-and-edit any player in the dataset.
- **User Accounts & Saved Boards**: Register as Coach/Scout/Admin, save tactical board snapshots (lineup + drawings + notes) and load them back onto the pitch.

---

## 🛠️ Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), Tailwind CSS, Framer Motion, `@hello-pangea/dnd`, Recharts, Lucide React |
| Backend API | Node.js, Express, Mongoose, JWT (`jsonwebtoken` + `bcrypt`), Axios, Helmet |
| Database | MongoDB (13 collections), embedded `mongodb-memory-server` auto-fallback |
| Dataset | EA FC / sofifa CSV dumps (~20.9k players) & StatsBomb Open Data (Match events & Passing Networks) |
| ML Microservice | Python 3.10+, Flask, scikit-learn (GradientBoostingRegressor, RandomForest, KNN) |
| Hosting | **Vercel** (free tier: frontend + serverless Express API) + MongoDB Atlas |

---

## 📋 Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js 18+** | 20 LTS recommended. `node --version` |
| **npm** | Ships with Node. |
| MongoDB | **Optional.** Without one, an embedded MongoDB starts automatically. |
| Python 3.10+ | **Optional.** Only for the ML microservice (predicted rating, form, KNN, AI tactics). |
| Internet | Player photos and club badges are hotlinked from the sofifa CDN. |

---

## 💻 Full Setup Guide

### Step 1 — Install dependencies

```bash
npm run setup
```

This installs the root, `server/`, `client/` and `database/` packages. To do it
by hand:

```bash
npm install
npm --prefix server install
npm --prefix client install
npm --prefix database install
```

### Step 2 — Put the dataset in place (recommended)

Drop the EA FC (Kaggle / sofifa) dumps into `database/`:

```
database/male_players.csv     database/female_players.csv
database/male_teams.csv       database/female_teams.csv
database/male_coaches.csv     database/female_coaches.csv
```

They are **gitignored** — `male_players.csv` alone is ~96 MB, past what belongs
in a repo. If they are missing the app still runs: it falls back to the 25-player
JSON fixtures in `database/fixtures/`.

### Step 3 — Run it

```bash
npm run dev
```

| Service | URL |
|---|---|
| Client (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:5000/api/health |

Or run the two halves in separate terminals:

```bash
npm run dev:server    # Express API on :5000 (nodemon)
npm run dev:client    # Vite client on :5173
```

### Step 4 — Optional: the Flask ML microservice

Without it the app works fine; the ML panels just say the service is unreachable.

**Windows (PowerShell)**
```powershell
cd ml-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py            # serves on :5001
```

**macOS / Linux**
```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The trained `.pkl` models are committed. To retrain: `python model/train_model.py`.
Confirm it is wired up: `curl http://localhost:5000/api/health` should report
`"mlService": {"status": "ok"}`.

### Step 5 — Log in

Two accounts are created during the load:

| Account | Email | Password |
|---|---|---|
| Coach | `coach@taqtiq.com` | `password123` |
| Admin | `admin@taqtiq.com` | `password123` |

An account is only needed for the watchlist and saved tactical boards — the
pitch, stats and scouting pages work signed out.

---

## 🗄️ How the data gets loaded

Everything is automatic; the manual commands below are escape hatches.

| When | What happens |
|---|---|
| API starts, database empty | Reads the CSVs in `database/`, loads leagues → clubs → players → attributes → season lines, then seeds formations, demo accounts and demo fixtures. ~10 s of work. |
| API starts, database populated | Skips the load and serves immediately. |
| While loading | The client shows a progress screen instead of empty dropdowns, polling `GET /api/admin/status`. |
| Force a rebuild | `npm run seed` |
| Force a rebuild, server already running | `Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/seed-kaggle' -Method Post` (PowerShell) or `curl -X POST http://localhost:5000/api/admin/seed-kaggle` |

Watch progress at any time:

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/status'
# state / phase / detail / counts, e.g. inserting - players 10000/20922
```

**Only the newest FIFA edition is imported.** The dumps stack every edition from
15 through 24, newest-first (~180k male rows). The loader reads the version of
the first row and stops streaming as soon as an older one appears — that keeps
~20k current players, turns a 96 MB parse into roughly 10 MB, and avoids the
duplicate-key errors the previous importer hit on repeated `player_id`s.

**MongoDB is optional.** Resolution order:

1. `MONGO_URI` (an Atlas cluster, or any reachable server)
2. a local `mongod` on `:27017`
3. an embedded MongoDB, persisted to `.mongo-data/` so the ingested dataset
   survives restarts

### Where the player images come from

The CSV dumps contain **no image columns at all**. Photos and badges are derived
from the sofifa CDN using the IDs that *are* in the data:

| Asset | URL built by the loader | Example |
|---|---|---|
| Player photo | `cdn.sofifa.net/players/<id 0-padded to 6, split 3/3>/24_120.png` | Haaland (`239085`) → `.../players/239/085/24_120.png` |
| Club badge | `cdn.sofifa.net/teams/<club_team_id>/60.png` | Man City (`10`) → `.../teams/10/60.png` |
| Nation flag | `nation_flag_url`, present in the coaches CSVs | `.../flags/gb-eng.png` |

They are hotlinked, so an internet connection is needed at render time; every
`<img>` has an `onError` handler that falls back to the player's initials. To
self-host instead, download them once into `client/public/players/` and change
`playerPhoto()` / `teamBadge()` in [database/ingest_kaggle.js](database/ingest_kaggle.js).

---

## 🐳 Running with Docker

```bash
docker compose up --build
```

| Service | Port |
|---|---|
| client | 5173 |
| server | 5000 |
| ml-service | 5001 |
| mongo | 27017 |

The server image is built from the **repository root** (`server/Dockerfile` with
`context: .`) so that `database/` — the loader and the CSVs — is inside the
image. Compose passes `MONGO_URI=mongodb://mongo:27017/taqtiq`, so the dataset
persists in the `mongo-data` volume and is loaded once on first boot.

---

## 🚀 Free Vercel Deployment Guide

**taqtiq** is designed to be hosted **100% free on Vercel** (frontend and Express
API) with a free **MongoDB Atlas** cluster.

```
                     ┌─────────────────────────────────────────┐
                     │            Vercel (Free Tier)           │
                     │  ┌───────────────────┐                  │
                     │  │ Client SPA        │                  │
                     │  │ (Vite React dist) │                  │
                     │  └─────────┬─────────┘                  │
                     │            │ rewrites                   │
                     │            ▼                            │
                     │  ┌───────────────────┐                  │
                     │  │ Express API       │                  │
                     │  │ (api/index.js)    │                  │
                     │  └─────────┬─────────┘                  │
                     └────────────┼────────────────────────────┘
                                  │ mongodb+srv://
                                  ▼
                     ┌─────────────────────────┐
                     │   MongoDB Atlas Free    │
                     │     (M0 Sandbox)        │
                     └─────────────────────────┘
```

### Step 1: Create a free MongoDB Atlas database
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free **M0 cluster**.
2. Under **Database Access**, create a database user and password.
3. Under **Network Access**, add `0.0.0.0/0` (required for Vercel serverless functions).
4. Copy the connection string, e.g. `mongodb+srv://<user>:<pass>@cluster.mongodb.net/taqtiq?retryWrites=true&w=majority`.

### Step 2: Deploy to Vercel
1. Push the repository to GitHub / GitLab / Bitbucket.
2. Go to the [Vercel Dashboard](https://vercel.com/new) → **Add New Project** and import it.
3. Set the **Framework Preset** to **Vite**.
4. Configure these **Environment Variables**:

| Key | Example Value | Description |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://<user>:<pass>@cluster.mongodb.net/taqtiq` | MongoDB Atlas URI |
| `JWT_SECRET` | `your_production_jwt_secret_key` | Secret for signing auth tokens |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` | Vercel production domain |

5. Click **Deploy**. Vercel builds the client into `client/dist` and exposes the Express API as a serverless function via `api/index.js`.

### Step 3: Seed Atlas once

Serverless functions deliberately **do not** auto-load the dataset — the CSVs are
gitignored (too large to deploy), lambdas are ephemeral, and concurrent
invocations would race each other into a half-written collection. Seed the
cluster once from a machine that has the CSVs:

```powershell
# PowerShell
$env:MONGO_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/taqtiq"; npm run seed
```
```bash
# bash
MONGO_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/taqtiq" npm run seed
```

---

## ⚙️ Environment Variables

Set in `server/.env` for local development.

| Key | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `CLIENT_ORIGIN` | `*` | CORS allow-list |
| `MONGO_URI` | *(auto)* | Mongo connection string; falls back to a local then an embedded server |
| `JWT_SECRET` | dev fallback | **Change in production** — signs auth tokens |
| `ML_SERVICE_URL` | `http://localhost:5001` | Flask microservice base URL |
| `CACHE_TTL_MINUTES` | `360` | Upstream cache freshness window |
| `VITE_API_PROXY` | `http://localhost:5000` | Client-side dev proxy target (set by Docker Compose) |

---

## 📁 Project Layout

```
taqtiq/
├── api/index.js              # Vercel serverless entry point
├── client/                   # React + Vite SPA
│   └── src/
│       ├── components/       # FutCard, pitch grid, bench rail, telestrator, modals
│       ├── context/          # AuthContext, SquadContext (+ dataset-load gate)
│       ├── pages/            # PitchView, TeamStats, Scouting, CreatorStudio, Account
│       └── services/api.js   # single axios client — all endpoints live here
├── database/
│   ├── bootstrap.js          # orchestrates "make the database usable"
│   ├── ingest_kaggle.js      # streams the CSV dumps, newest edition only
│   ├── seed.js               # CLI wrapper: npm run seed
│   ├── fixtures/             # small JSON fallback dataset + formation templates
│   └── *.csv                 # your EA FC dumps (gitignored)
├── ml-service/               # Flask + scikit-learn microservice
├── server/src/
│   ├── config/db.js          # connection strategy + auto-load trigger
│   ├── controllers/          # players, leagues, boards, watchlist, team stats, auth
│   ├── models/               # 13 Mongoose schemas
│   └── routes/players.js     # all /api routes
└── docker-compose.yml
```

---

## 📡 API Reference (`/api`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API, database, dataset and ML service status |
| `GET` | `/api/admin/status` | Dataset load state, phase and record counts |
| `POST` | `/api/admin/seed-kaggle` | Force a dataset rebuild (runs in the background) |
| `POST` | `/api/auth/register` | Register a new user (`admin`/`coach`/`scout`) |
| `POST` | `/api/auth/login` | Authenticate and return a JWT |
| `GET` | `/api/auth/me` | Fetch the authenticated user profile |
| `PUT` | `/api/auth/preferences` | Update user preferences |
| `GET` | `/api/leagues` | List leagues with club counts |
| `GET` | `/api/teams?league=` | List clubs in a league |
| `POST` | `/api/teams` | Create a custom club |
| `GET` | `/api/teams/:id/squad?formation=` | Starting XI + bench, auto-assigned by positional fit |
| `GET` | `/api/players/search?q=&position=&limit=` | Search the player pool by name / position group |
| `GET` | `/api/players/:id` | Single enriched player |
| `POST`/`PUT` | `/api/players` · `/api/players/:id` | Create / edit a player |
| `GET` | `/api/players/:id/insights` | ML predicted rating + form label |
| `GET` | `/api/players/:id/similar` | KNN similarity matches with per-feature deltas |
| `GET` | `/api/formations` | Formation templates and slot coordinates |
| `POST` | `/api/tactics/suggest` | Formation-aware tactical suggestions |
| `GET/POST/PUT/DEL` | `/api/boards` | Save/load/update/delete tactical board snapshots |
| `GET` | `/api/teams/:id/leaderboards` | Season leaderboards (goals, assists, pass acc., tackles) |
| `GET` | `/api/teams/:id/matches` | Fixtures for a club |
| `GET` | `/api/matches/:id/passing-network` | Passing network coordinates |
| `GET` | `/api/matches/:id/heatmap` | Defensive heatmap zones |
| `GET` | `/api/matches/:id/shot-map` | Shot coordinates and outcomes |
| `GET/POST/DEL` | `/api/watchlist` | Manage the starred scouting watchlist |

---

## 🩺 Troubleshooting

| Symptom | Cause / fix |
|---|---|
| **"API unreachable"** on the loading screen | The API is not running, or is still starting the embedded MongoDB (~5 s). Start it with `npm run dev:server` and check that nothing else owns port 5000. |
| Stuck on **"Loading the player dataset"** | Normal on a first run — watch `npm run dev:server` output, or `GET /api/admin/status`. Ten seconds of parsing plus MongoDB start-up. |
| **"Dataset load failed"** | The status response carries the error. Usually a missing or truncated CSV; check the six filenames in `database/`. |
| Only 25 players / 13 clubs show up | The CSVs were not found and the JSON fixtures were used. Confirm with `GET /api/admin/status` → `"source": "fixtures"`. |
| Player photos are blank | Photos are hotlinked from the sofifa CDN — check internet access. Cards fall back to initials. |
| ML panels say the service is unreachable | The Flask service is not running. See Step 4; it is optional. |
| Rebuild from scratch | Stop the API, delete `.mongo-data/`, start it again. |
| Port 5000 or 5173 already in use | Change `PORT` in `server/.env`, or the `server.port` in `client/vite.config.js`. |

---

## 📄 License

MIT License. Designed for football coaches, analysts, and enthusiasts.
