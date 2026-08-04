# Data Resolution Guide: Fixing Incorrect Players & Missing Stats

If you are seeing players on the wrong teams, generic actor photos, or completely random/incorrect stats (Pace, Shooting, etc.), it is a direct result of how the **free public API fallback** operates. 

This document explains exactly why these issues occur and the two methods to permanently fix them.

---

## 🛑 The Core Issue: Why is the data wrong?

Currently, if you search for a team (e.g., "Arsenal"), the application tries to pull players from a free public API called **TheSportsDB**.

**The problem with free APIs:**
1. **No EA FC / FIFA Stats**: Free APIs only provide real-world rosters (Names, Ages, Positions). They do NOT own the rights to EA Sports' proprietary ratings (Pace, Shooting, Passing, Dribbling, etc.). 
2. **The Band-Aid Solution**: Because our UI requires those 6 core stats to render a `FutCard`, our backend generates **randomized, fake stats** for any player it fetches from the API so the app doesn't crash.
3. **Missing Photos**: If the API doesn't have a headshot for a player, the app previously tried to pull a random placeholder image (which resulted in random actors). We have since hotfixed this to show elegant **Initials** (e.g., "JB") instead.

---

## ✅ Method 1: The Ultimate Fix (The Kaggle Dataset)

To get 100% accurate data—including all 19,000 real players, their exact EA FC 24 ratings, perfect chemistry links, and real team assignments—you must bypass the free API entirely and inject the real EA dataset into your database.

This is completely free and bypasses all API rate limits.

**Step-by-Step Instructions:**
1. Go to [Kaggle.com](https://www.kaggle.com) and search for the **EA Sports FC 24 Complete Player Dataset**.
2. Download the `.csv` file.
3. Rename the downloaded file exactly to: **`players.csv`**
4. Place this file inside your project folder at: `d:\football\database\players.csv`
5. Open your terminal in the root folder (`d:\football`) and run the data ingestion script:
   ```bash
   npm run seed:kaggle
   ```
6. **Result**: The script will read all 19,000 rows, map every single player's real Pace, Shooting, Passing, Dribbling, Defending, and Physicality, and permanently save them to your MongoDB. Your data issues will be completely resolved.

---

## ✅ Method 2: The Manual Fix (Custom Creator Studio)

If you only care about a few specific teams or want to manually fix a player whose stats are wrong, you can use the **Custom Creator Studio** (currently being built in Phase 2).

**How it will work:**
1. Navigate to the **Creator Studio** tab in your app.
2. Select **Create/Edit Player**.
3. You will see a form where you can manually type in a player's real Name, assign them to a Team, and use sliders to perfectly set their Pace, Shooting, Passing, Dribbling, Defending, and Physicality.
4. **Result**: This overrides the fake API data and saves your perfect, hand-crafted player directly to the database for use on the 3D Pitch.

---

### Summary
- **If you want all 19,000 real players instantly:** Use **Method 1** (Kaggle Dataset).
- **If you want to manually tweak stats or create yourself in the game:** Use **Method 2** (Creator Studio).
