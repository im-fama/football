"""
Trains two lightweight scikit-learn models used by the ML microservice:

1. `rating_model`   (GradientBoostingRegressor) -> predicts a player's
   "true" overall rating from raw per-90 stats, so the app can show a
   model-predicted rating next to the stat-formula rating.

2. `form_model`     (RandomForestClassifier)    -> classifies a player's
   current run of form into one of: "Declining", "Average", "In Form"
   based on recent-vs-season stat deltas.

No external football data is required to train these - we generate a
realistic synthetic dataset that spans the statistical distributions
seen across professional outfield players (goals, assists, passing,
defensive actions, etc.) grouped loosely by position archetype. This
keeps the service fully self-contained and reproducible.

Run:  python train_model.py
Outputs: rating_model.pkl, form_model.pkl, scaler.pkl (in this folder)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score
import joblib
import os

RNG = np.random.default_rng(42)
N_SAMPLES = 6000

POSITION_ARCHETYPES = ["GK", "DEF", "MID", "FWD"]

def synth_dataset(n=N_SAMPLES):
    positions = RNG.choice(POSITION_ARCHETYPES, size=n, p=[0.1, 0.3, 0.35, 0.25])
    rows = []
    for pos in positions:
        age = int(np.clip(RNG.normal(25, 4), 16, 40))
        matches = int(np.clip(RNG.normal(24, 8), 1, 38))
        minutes = matches * np.clip(RNG.normal(75, 15), 10, 96)

        if pos == "GK":
            goals = 0
            assists = RNG.poisson(0.05)
            pass_acc = np.clip(RNG.normal(72, 8), 40, 95)
            tackles = RNG.poisson(0.3)
            interceptions = RNG.poisson(0.5)
            shots_on_target_pct = 0
            duels_won_pct = np.clip(RNG.normal(55, 10), 20, 90)
            saves_p90 = np.clip(RNG.normal(3.2, 1.1), 0, 9)
        elif pos == "DEF":
            goals = RNG.poisson(0.08)
            assists = RNG.poisson(0.1)
            pass_acc = np.clip(RNG.normal(83, 6), 50, 98)
            tackles = np.clip(RNG.normal(2.6, 1.0), 0, 8)
            interceptions = np.clip(RNG.normal(1.8, 0.9), 0, 7)
            shots_on_target_pct = np.clip(RNG.normal(30, 15), 0, 100)
            duels_won_pct = np.clip(RNG.normal(58, 10), 20, 95)
            saves_p90 = 0
        elif pos == "MID":
            goals = RNG.poisson(0.22)
            assists = RNG.poisson(0.2)
            pass_acc = np.clip(RNG.normal(85, 6), 55, 98)
            tackles = np.clip(RNG.normal(2.0, 0.9), 0, 7)
            interceptions = np.clip(RNG.normal(1.4, 0.8), 0, 6)
            shots_on_target_pct = np.clip(RNG.normal(35, 15), 0, 100)
            duels_won_pct = np.clip(RNG.normal(52, 10), 20, 90)
            saves_p90 = 0
        else:  # FWD
            goals = RNG.poisson(0.45)
            assists = RNG.poisson(0.22)
            pass_acc = np.clip(RNG.normal(78, 7), 40, 95)
            tackles = np.clip(RNG.normal(0.8, 0.5), 0, 4)
            interceptions = np.clip(RNG.normal(0.5, 0.4), 0, 3)
            shots_on_target_pct = np.clip(RNG.normal(45, 15), 0, 100)
            duels_won_pct = np.clip(RNG.normal(48, 10), 15, 90)
            saves_p90 = 0

        pace = np.clip(RNG.normal(70, 12), 30, 99)
        dribbling = np.clip(RNG.normal(68, 12), 25, 99)
        physical = np.clip(RNG.normal(68, 11), 30, 99)

        # "true" latent quality score that the visible stats are a noisy
        # function of - this is what the regressor learns to reconstruct.
        base = (
            goals * 3.2
            + assists * 2.4
            + (pass_acc - 70) * 0.35
            + tackles * 1.1
            + interceptions * 1.0
            + (duels_won_pct - 50) * 0.18
            + (pace - 70) * 0.12
            + (dribbling - 70) * 0.12
            + (physical - 70) * 0.08
            + saves_p90 * 2.6
            + (minutes / matches if matches else 0) * 0.05
        )
        overall = np.clip(62 + base + RNG.normal(0, 2.5), 45, 99)

        # recent-form deltas (last 5 games vs season average), used for
        # the form classifier
        recent_goal_delta = RNG.normal(0, 1)
        recent_pass_delta = RNG.normal(0, 4)
        recent_rating_delta = np.clip(
            recent_goal_delta * 1.3 + recent_pass_delta * 0.15 + RNG.normal(0, 1.2), -6, 6
        )
        if recent_rating_delta > 1.2:
            form_label = "In Form"
        elif recent_rating_delta < -1.2:
            form_label = "Declining"
        else:
            form_label = "Average"

        rows.append(
            dict(
                position=pos,
                age=age,
                matches=matches,
                minutes=minutes,
                goals=goals,
                assists=assists,
                pass_accuracy=pass_acc,
                tackles_p90=tackles,
                interceptions_p90=interceptions,
                shots_on_target_pct=shots_on_target_pct,
                duels_won_pct=duels_won_pct,
                saves_p90=saves_p90,
                pace=pace,
                dribbling=dribbling,
                physical=physical,
                overall_rating=overall,
                recent_rating_delta=recent_rating_delta,
                form_label=form_label,
            )
        )
    return pd.DataFrame(rows)


FEATURE_COLS = [
    "age", "matches", "minutes", "goals", "assists", "pass_accuracy",
    "tackles_p90", "interceptions_p90", "shots_on_target_pct",
    "duels_won_pct", "saves_p90", "pace", "dribbling", "physical",
]

FORM_FEATURE_COLS = FEATURE_COLS + ["recent_rating_delta"]


def main():
    df = synth_dataset()
    out_dir = os.path.dirname(os.path.abspath(__file__))

    # ---- Rating regressor ----
    X = df[FEATURE_COLS].values
    y = df["overall_rating"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler().fit(X_train)
    X_train_s, X_test_s = scaler.transform(X_train), scaler.transform(X_test)

    rating_model = GradientBoostingRegressor(
        n_estimators=250, max_depth=3, learning_rate=0.05, random_state=42
    )
    rating_model.fit(X_train_s, y_train)
    mae = mean_absolute_error(y_test, rating_model.predict(X_test_s))
    print(f"[rating_model] MAE on holdout: {mae:.2f} rating points")

    # ---- Form classifier ----
    Xf = df[FORM_FEATURE_COLS].values
    yf = df["form_label"].values
    Xf_train, Xf_test, yf_train, yf_test = train_test_split(Xf, yf, test_size=0.2, random_state=42)

    form_model = RandomForestClassifier(n_estimators=300, max_depth=8, random_state=42)
    form_model.fit(Xf_train, yf_train)
    acc = accuracy_score(yf_test, form_model.predict(Xf_test))
    print(f"[form_model] accuracy on holdout: {acc:.2%}")

    joblib.dump(rating_model, os.path.join(out_dir, "rating_model.pkl"))
    joblib.dump(form_model, os.path.join(out_dir, "form_model.pkl"))
    joblib.dump(scaler, os.path.join(out_dir, "scaler.pkl"))
    print(f"Saved models to {out_dir}")


if __name__ == "__main__":
    main()
