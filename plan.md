# taqtiq — Football Decision Platform Roadmap

This plan updates the current FC26-style Squad Builder into a broader football operations product that is useful for coaches, scouts, analysts, content creators, and fans.

---

## 1. Product Vision

Turn the app from a single-purpose lineup builder into a unified football decision platform with three core value pillars:

- **Tactical Planning**: interactive pitch boards, formation design, ball movement, set-piece workflows.
- **Scouting & Analysis**: player discovery, similarity search, team analytics, match insights.
- **Collaboration & Sharing**: saved boards, shared tactics, public templates, exportable plans.

This makes the tool valuable for:

- coaches planning training and match tactics
- scouts identifying and comparing players
- analysts tracking team performance and trends
- content creators sharing tactics and fantasy squads
- learning coaches and fans exploring football strategy

---

## 2. Audience Expansion

### Coaches / Analysts

- Match preparation dashboard
- opponent analysis and formation recommendations
- lineups with transition phases (attack/defense/press)
- set-piece templates and drill libraries

### Scouts / Recruiters

- advanced filtered player search
- player similarity and positional fit scoring
- watchlist alerts and shortlist creation
- compare players head-to-head by metrics

### Content Creators / Community

- shareable tactic boards and public templates
- export boards to PNG/PDF
- community tactics feed and library

### Fans / Fantasy Players

- fantasy squad builder mode
- player rating trend cards
- quick squad previews for popular teams

---

## 3. Updated Feature Roadmap

### Phase 1 — Strengthen the Core

- Add richer pitch tools:
  - ball placement and movement path tool
  - zone shading / tactical heat overlays
  - set-piece mode and phase labels
- Improve onboarding and empty states
- Add role-based workspace entrypoints:
  - Coach Workspace
  - Scout Workspace
  - Analytics Workspace

### Phase 2 — Expand Scouting & Analysis

- Add advanced scouting filters:
  - league, position, age, overall, strengths/weaknesses
- Add compare-by-metrics workflow
- Create shared watchlist and alert support
- Improve team analytics with match-level context and opponent reports

### Phase 3 — Collaboration & Content

- Save and share tactical boards externally
- Add public/shared boards or community templates
- Add board export (PNG/PDF)
- Add board version history and notes

### Phase 4 — Data & ML Enhancements

- Improve data sourcing:
  - keep TheSportsDB rosters for real squads
  - continue using Kaggle FIFA stats for attributes
- Add richer ML services:
  - tactical suggestion engine
  - player similarity and fit scoring
  - lineup strength / expected goals simulation

---

## 4. Current Data Strategy

### A. Hybrid roster sourcing

- Real rosters are loaded from TheSportsDB for live player names, positions, and club links.
- These records are cached in MongoDB so future loads are instant.
- This keeps the app grounded in actual football teams, while allowing custom attributes.

### B. FIFA stats and attribute data

- Official EA FC data is protected and not freely available.
- The current approach uses pseudo-generated stats for live API players.
- The Kaggle CSV loader remains the strongest source for accurate FIFA-style attributes and bulk import.

### C. Recommended long-term source model

1. `TheSportsDB` for roster metadata, club names, league relationships, and live imagery.
2. Kaggle/EA FC dataset for player attributes and historical ratings.
3. Custom creator studio for user-defined players, clubs, and formations.

---

## 5. Backend Audit & Improvements

### Existing strengths

- Modular Express API with players, teams, formations, boards, analytics, watchlist, and auth.
- Auto-bootstrap dataset behavior with embedded Mongo fallback.
- ML microservice already wired for similarity and tactics.

### Recommended backend enhancements

- Add more audience-specific APIs:
  - `GET /players/filters` for advanced scouting queries
  - `GET /boards/shared` for public tactics
  - `GET /reports/opponent` for match prep
  - `POST /alerts` for watchlist notifications
- Add richer health metadata:
  - dataset version, last seed time, ML service status
- Add user profile fields:
  - role preference (coach/scout/fan)
  - saved dashboards, board collections, template library

---

## 6. UI/UX Improvements

### Structural improvements

- Create distinct workspace entrypoints instead of one flat navigation bar.
- Use contextual toolbars for pitch tools, analytics filters, and scouting controls.
- Add a visible dashboard landing page that summarizes team health, active boards, and recommended actions.

### Usability improvements

- Add first-run walkthrough and in-app tips for pitch controls.
- Improve empty states with suggested actions and next steps.
- Make the app responsive and mobile-friendly with simplified toolsets.
- Add clearer feedback when drawing, moving the ball, or saving boards.

---

## 7. Priority Deliverables

### Must ship first

- ball placement + drag tool on the pitch
- shared board save/load workflow
- better onboarding and empty states
- advanced player scouting filters

### Next

- public/shared boards + export
- opponent report generator
- watchlist alerts and saved dashboard views

### Future

- full match prep workflow
- set-piece and drill templates
- ML-driven lineup optimization
- fantasy/fan mode

---

## 8. Why this direction

This update shifts the app from a narrow squad builder into a platform for football decision-making. It keeps the current technical strengths while making the product useful for a far broader audience: coaches, analysts, scouts, creators, and fans.
