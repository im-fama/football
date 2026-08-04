# Football Squad Builder - Implementation & Feature Plan

This document outlines the current state, data fetching strategies, and upcoming features for the FC26-style Squad Builder application.

---

## 1. Data Fetching Strategies

We are currently using a **Hybrid Data Approach**. 

### A. Real-World Rosters (Live Public API - *Currently Active*)
We are already pulling real-world teams and players from a public API (`TheSportsDB`). 
- **How it works**: When you search for a team (e.g., "Arsenal"), our backend pings the public API, pulls their real-life roster, and immediately saves them to your MongoDB so it loads instantly next time.
- **The Catch**: This free public API provides names, photos, and positions, but it **DOES NOT** provide EA FC/FIFA attributes (Pace, Shooting, Dribbling). 

### B. Can we pull FIFA Stats from a Public API?
**Yes, but it's tricky.** Official EA FC stats are heavily protected by EA Sports. 
- There are community APIs like **FutDB.app**, but they require API keys and have strict rate limits (making it hard to load 11 players at once without paying for a premium tier).
- **The Workaround**: For now, our app assigns pseudo-randomized stats to the real players we fetch from TheSportsDB. 
- **The Ultimate Fix (Kaggle CSV)**: To get 100% accurate FIFA stats for all 19,000 players completely for free with no rate limits, we built a script to import the Kaggle EA FC Dataset directly into your database.

---

## 2. Upcoming Features & Functionalities

### Phase 2: Custom Creator Studio (In Progress)
- **Club Creator**: Upload a custom team badge, set a club name, and assign a league.
- **Player Creator**: Custom define a player's name, position, and manually input their Pace, Shooting, Passing, Dribbling, Defending, and Physicality (creating a custom `FutCard`).
- **Database Integration**: Custom players will be seamlessly searchable in the `SquadLoader` alongside real API players.

### Phase 3: Formations Builder
- **Custom Tactics**: Drag and drop 11 nodes anywhere on a 2D pitch to create entirely custom formations (e.g., 2-3-5, 4-1-2-1-2).
- **Save & Load**: Save custom formations to your account and select them from the Pitch View dropdown.

### Phase 4: Match Analytics & Machine Learning (Future)
- **Heatmaps & Shot Maps**: Visual representations of player activity on the pitch using D3.js and HTML5 Canvas.
- **ML Player Insights**: Python microservice (`ml-service`) provides "Similar Players" and "Performance Predictions" based on historical stats.
