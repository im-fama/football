"""
Wraps the trained scikit-learn models and exposes clean predict()
functions for the Flask app. Falls back to a transparent rule-based
heuristic if the .pkl files are missing (e.g. fresh clone before
`python train_model.py` has been run), so the API never hard-fails.
"""

import os
import numpy as np
import joblib

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURE_COLS = [
    "age", "matches", "minutes", "goals", "assists", "pass_accuracy",
    "tackles_p90", "interceptions_p90", "shots_on_target_pct",
    "duels_won_pct", "saves_p90", "pace", "dribbling", "physical",
]
FORM_FEATURE_COLS = FEATURE_COLS + ["recent_rating_delta"]


def _load(name):
    path = os.path.join(MODEL_DIR, name)
    return joblib.load(path) if os.path.exists(path) else None


class PlayerModels:
    def __init__(self):
        self.rating_model = _load("rating_model.pkl")
        self.form_model = _load("form_model.pkl")
        self.scaler = _load("scaler.pkl")
        self.ready = all([self.rating_model, self.form_model, self.scaler])

    def _vector(self, stats: dict, cols):
        return np.array([[float(stats.get(c, 0) or 0) for c in cols]])

    def predict_rating(self, stats: dict) -> dict:
        if self.ready:
            X = self._vector(stats, FEATURE_COLS)
            X_s = self.scaler.transform(X)
            pred = float(self.rating_model.predict(X_s)[0])
            # feature importances give a lightweight "why" explanation
            importances = self.rating_model.feature_importances_
            top_idx = np.argsort(importances)[::-1][:3]
            drivers = [FEATURE_COLS[i] for i in top_idx]
            return {
                "predicted_rating": round(pred, 1),
                "method": "gradient_boosting_regressor",
                "top_drivers": drivers,
            }
        return self._fallback_rating(stats)

    def predict_form(self, stats: dict) -> dict:
        if self.ready:
            X = self._vector(stats, FORM_FEATURE_COLS)
            label = self.form_model.predict(X)[0]
            proba = self.form_model.predict_proba(X)[0]
            classes = list(self.form_model.classes_)
            confidence = float(proba[classes.index(label)])
            return {
                "form_label": label,
                "confidence": round(confidence, 2),
                "method": "random_forest_classifier",
            }
        return self._fallback_form(stats)

    # ---- rule-based fallbacks (used only if models aren't trained yet) ----
    def _fallback_rating(self, stats):
        goals = float(stats.get("goals", 0) or 0)
        assists = float(stats.get("assists", 0) or 0)
        pass_acc = float(stats.get("pass_accuracy", 70) or 70)
        base = 60 + goals * 2.5 + assists * 2 + (pass_acc - 70) * 0.3
        return {
            "predicted_rating": round(min(max(base, 45), 99), 1),
            "method": "rule_based_fallback",
            "top_drivers": ["goals", "assists", "pass_accuracy"],
        }

    def _fallback_form(self, stats):
        delta = float(stats.get("recent_rating_delta", 0) or 0)
        if delta > 1.2:
            label = "In Form"
        elif delta < -1.2:
            label = "Declining"
        else:
            label = "Average"
        return {"form_label": label, "confidence": 0.6, "method": "rule_based_fallback"}


player_models = PlayerModels()
