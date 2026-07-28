import { Formation } from "../models/index.js";

export async function listFormations(req, res, next) {
  try {
    const formations = await Formation.find({}).sort({ name: 1 });
    res.json({ count: formations.length, formations });
  } catch (err) {
    next(err);
  }
}
