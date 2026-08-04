"""
Flask ML microservice.

Endpoints:
  GET  /health
  POST /predict/rating       -> { predicted_rating, method, top_drivers }
  POST /predict/form         -> { form_label, confidence, method }
  POST /predict/player       -> both of the above combined, single call
  POST /similarity           -> top-k nearest neighbours from a candidate pool (KNN)

Run:
  pip install -r requirements.txt
  python model/train_model.py     # one-time: generates the .pkl files
  python app.py                   # serves on :5001
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.neighbors import NearestNeighbors
import numpy as np

from model.predictor import player_models, FEATURE_COLS

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify(status="ok", models_ready=player_models.ready)


@app.post("/predict/rating")
def predict_rating():
    stats = request.get_json(force=True) or {}
    return jsonify(player_models.predict_rating(stats))


@app.post("/predict/form")
def predict_form():
    stats = request.get_json(force=True) or {}
    return jsonify(player_models.predict_form(stats))


@app.post("/predict/player")
def predict_player():
    stats = request.get_json(force=True) or {}
    rating = player_models.predict_rating(stats)
    form = player_models.predict_form(stats)
    return jsonify({**rating, **form})


@app.post("/similarity")
def similarity():
    """
    Body: { "target": {...stats}, "candidates": [{ "id": "...", ...stats }, ...], "k": 5 }
    Returns the k nearest neighbours to `target` by Euclidean distance
    over FEATURE_COLS, plus a per-feature delta so the client can render
    a human-readable "why they're similar" explanation.
    """
    body = request.get_json(force=True) or {}
    target = body.get("target", {})
    candidates = body.get("candidates", [])
    k = min(int(body.get("k", 5)), max(len(candidates), 1))

    if not candidates:
        return jsonify(results=[])

    def vec(stats):
        return [float(stats.get(c, 0) or 0) for c in FEATURE_COLS]

    X = np.array([vec(c) for c in candidates])
    means, stds = X.mean(axis=0), X.std(axis=0) + 1e-6
    X_norm = (X - means) / stds
    target_vec = (np.array(vec(target)) - means) / stds

    n_neighbors = min(k, len(candidates))
    nn = NearestNeighbors(n_neighbors=n_neighbors, metric="euclidean").fit(X_norm)
    distances, indices = nn.kneighbors([target_vec])

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        cand = candidates[idx]
        deltas = {}
        for col in FEATURE_COLS:
            d = float(cand.get(col, 0) or 0) - float(target.get(col, 0) or 0)
            if abs(d) >= 1:
                deltas[col] = round(d, 1)
        results.append({
            "id": cand.get("id"),
            "distance": round(float(dist), 3),
            "similarity_pct": round(max(0, 100 - float(dist) * 12), 1),
            "key_differences": deltas,
        })

    return jsonify(results=results)


@app.post("/predict/tactics")
def predict_tactics():
    """
    Body: { "formation": "4-3-3", "players": [{ "overallRating": 85, "position": "FW" }, ...] }
    Returns: a list of suggested tactics.
    """
    body = request.get_json(force=True) or {}
    formation = body.get("formation", "4-3-3")
    players = body.get("players", [])

    if not players:
        return jsonify(suggestions=[{
            "name": "Balanced", 
            "match_score": 50, 
            "reason": "Not enough players to analyze."
        }])

    avg_rating = sum(float(p.get("overallRating", 65)) for p in players) / len(players)

    suggestions = []
    
    # Very simple heuristics-based ML tactics recommender
    if "4-3-3" in formation or "3-4-3" in formation:
        suggestions.append({
            "name": "Tiki-Taka",
            "match_score": min(99, int(avg_rating + 10)),
            "reason": f"Your {formation} formation thrives on short passing. With an average OVR of {int(avg_rating)}, your team can retain possession effectively."
        })
        suggestions.append({
            "name": "Gegenpressing",
            "match_score": min(99, int(avg_rating + 5)),
            "reason": "High press fits a 3-man forward line well to win the ball back high up the pitch."
        })
    elif "5-" in formation or "4-5-1" in formation or "5-3-2" in formation:
        suggestions.append({
            "name": "Park the Bus",
            "match_score": 95,
            "reason": f"A {formation} is naturally defensive. Sit deep and absorb pressure."
        })
        suggestions.append({
            "name": "Counter Attack",
            "match_score": min(99, int(avg_rating + 8)),
            "reason": "Absorb pressure with your backline and hit them on the break."
        })
    else:
        suggestions.append({
            "name": "Balanced",
            "match_score": 85,
            "reason": f"A standard {formation} gives you flexibility to adapt to the opponent."
        })
        suggestions.append({
            "name": "Wing Play",
            "match_score": min(99, int(avg_rating + 2)),
            "reason": "Utilize the width of the pitch to stretch the opposition defense."
        })

    # Sort by match_score descending
    suggestions.sort(key=lambda x: x["match_score"], reverse=True)
    return jsonify(suggestions=suggestions)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
