# PitchIQ — Football Analytics Dashboard

A full-stack, FIFA Ultimate Team–inspired football analytics platform. Browse
leagues and clubs, view players as interactive gold/silver/bronze cards, and
open any player to see stat visualizations plus **machine learning insights**:
a model-predicted overall rating, a form classification (In Form / Average /
Declining), and a KNN-powered "similar players" panel with a plain-English
explanation of *why* two players are alike.

```
┌────────────┐      REST/JSON      ┌────────────┐     REST/JSON     ┌───────────────┐
│  React      │  ───────────────▶  │  Express    │  ─────────────▶  │  Flask ML      │
│  (Vite)     │  ◀───────────────  │  API        │  ◀─────────────  │  microservice  │
│  :5173      │                    │  :5000      │                   │  :5001         │
└────────────┘                    └─────┬──────┘                   └───────────────┘
                                          │
                                          ▼
                                   ┌────────────┐        upstream
                                   │  MongoDB    │  ◀───────────────  TheSportsDB
                                   │  (cache)    │                    (public API)
                                   └────────────┘
```

## Stack

| Layer        | Tech                                                             |
|--------------|-------------------------------------------------------------------|
| Client       | React 18 (Vite), Tailwind CSS, Framer Motion, Recharts, Lucide    |
| Server       | Node.js, Express, Mongoose, Axios, Helmet, rate limiting          |
| Database     | MongoDB (caches/normalizes upstream player data)                  |
| ML service   | Python, Flask, scikit-learn (GradientBoosting, RandomForest, KNN) |
| Public data  | [TheSportsDB](https://www.thesportsdb.com/api.php) free API       |

## Project structure

```
football-analytics-dashboard/
├── client/            React (Vite) frontend
│   └── src/
│       ├── components/   PlayerCard, PlayerModal, StatRadar, StatBar, ...
│       ├── pages/         Dashboard.jsx
│       ├── services/      api.js (axios client)
│       └── utils/         cardTier.js (rating → tier/color mapping)
├── server/            Express API + MongoDB caching layer
│   └── src/
│       ├── controllers/   playerController.js
│       ├── models/        Player.js (mongoose schema)
│       ├── routes/        players.js
│       ├── scripts/       seed.js (DB migration/seed - see "Seeding" below)
│       ├── services/      footballApiService.js, mlClient.js, ratingFormula.js
│       └── middleware/    errorHandler.js
├── ml-service/         Flask ML microservice
│   ├── app.py             REST endpoints
│   └── model/
│       ├── train_model.py    generates rating_model.pkl / form_model.pkl
│       └── predictor.py      loads models, exposes predict_rating/predict_form
└── docker-compose.yml  One-command orchestration for all four services
```

## Running it

### Option A — Docker Compose (recommended)

```bash
docker compose up --build
```

This starts MongoDB, the ML service (models are trained automatically atbuild time), the Express API, and the Vite dev server. Open
**http://localhost:5173**.

### Option B — Run each service manually

> Commands below are for macOS/Linux (bash). **On Windows PowerShell**, run
> each line separately (PowerShell doesn't support `&&`) and activate the
> venv with `.venv\Scripts\Activate.ps1` instead of `source .venv/bin/activate`.

**1. ML service**
```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python model/train_model.py     # one-time: trains + pickles the models
python app.py                   # serves on :5001
```

**2. MongoDB**

Run a local instance (`mongod`) or point `MONGO_URI` in `server/.env` at a
free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. **Installing
MongoDB Compass alone is not enough** — Compass is just a GUI viewer, it
doesn't run a database. You need `mongod` (MongoDB Community Server)
actually running, or an Atlas connection string, before anything will show
up in Compass. The API still works without Mongo — it just falls back to
uncached, live upstream calls on every request instead of caching.

**3. Server**
```bash
cd server
cp .env.example .env
npm install
npm run dev      # nodemon, :5000
npm run seed     # optional but recommended - see "Seeding" below
```

**4. Client**
```bash
cd client
npm install
npm run dev       # :5173, proxies /api → :5000
```

## Seeding the database (migration)

`npm run seed` (from `/server`) connects to Mongo, syncs the indexes
declared on the `Player` model (unique `sourceId`, text search on
name/team/nationality), then pulls real rosters for the top 5 European
leagues from TheSportsDB and upserts them. This means:

- The dashboard has real data to show **immediately**, instead of depending
  on your first click and the upstream API responding in time.
- You get something to actually see in MongoDB Compass right away — open
  the `players` collection in your database after seeding finishes.
- It's safe to re-run any time; it upserts by `sourceId`; it won't
  duplicate.

It takes a minute or two since the free API tier is rate-limited to ~30
requests/min and the script paces itself accordingly.

## Troubleshooting

**Nothing shows up / MongoDB Compass is empty:**
1. Confirm `SPORTSDB_API_KEY=123` in `server/.env` (TheSportsDB retired the
   old shared key `3` — using it silently returns empty results, not an
   error, which looks exactly like "nothing is fetching").
2. Confirm `mongod` is actually running (see note above) and `MONGO_URI` in
   `.env` matches the database Compass is pointed at.
3. Run `npm run seed` from `/server` and watch the console output — it logs
   exactly which leagues/teams succeeded or failed.
4. Check the server's terminal output — failed upstream requests are logged
   with the exact URL and error rather than failing silently.

**Player cards have no photo:** every player always gets *some* image now —
a real photo when TheSportsDB has one, otherwise a generated colored-avatar
fallback — so a blank/broken image means the request itself failed. Check
the server logs for `[footballApi]` warnings.

## API reference (server, `/api`)

| Method | Route                         | Description                                              |
|--------|--------------------------------|------------------------------------------------------------|
| GET    | `/health`                     | Server + ML service health check                          |
| GET    | `/leagues`                    | List all soccer leagues                                    |
| GET    | `/teams?league=`              | Teams in a league                                           |
| GET    | `/players?teamId=`            | Squad for a team (cached in Mongo, normalized + rated)     |
| GET    | `/players/search?q=`          | Search players by name                                      |
| GET    | `/players/:id`                | Single player                                                |
| GET    | `/players/:id/insights`       | ML-predicted rating + form classification                   |
| GET    | `/players/:id/similar?poolTeamId=&k=` | KNN similar players within a candidate pool         |

## ML service reference (`ml-service`, port 5001)

| Method | Route              | Description                                          |
|--------|--------------------|--------------------------------------------------------|
| GET    | `/health`          | Model load status                                       |
| POST   | `/predict/rating`  | Stat vector → predicted overall rating                  |
| POST   | `/predict/form`    | Stat vector + recent delta → form label + confidence    |
| POST   | `/predict/player`  | Both of the above combined                               |
| POST   | `/similarity`       | Target + candidate pool → top-k nearest neighbours       |

## Notes on data

TheSportsDB's free tier returns rosters and player bios but not granular
per-90 performance stats. To keep the analytics and ML pipeline fully
functional end-to-end without requiring a paid data subscription, the server
derives a **deterministic, seeded** statline per player (seeded by their
player ID, so a given player always gets the same numbers across requests —
it's not random noise on every call). This mirrors how the reference design
clearly labels non-live panels rather than silently faking them. Swap
`footballApiService.js` for a paid provider (e.g. football-data.org,
API-Football, Opta) to replace derived stats with real ones — the rest of
the pipeline (caching, rating formula, ML service) is provider-agnostic and
needs no changes.

## Two ratings, on purpose

Each player card shows a **Card Rating** (a transparent, position-weighted
formula in `server/src/services/ratingFormula.js`) and, in the detail modal,
an **ML Predicted** rating from the trained GradientBoostingRegressor. Showing
both side by side is intentional — it lets you see where the model agrees or
diverges from the simple formula, and the modal also surfaces the model's
top feature drivers for that prediction.
#   f o o t b a l l 
 
 