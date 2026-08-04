import { Watchlist } from "../models/index.js";
import { isValidObjectId } from "mongoose";
import { enrichPlayerDoc } from "./playerController.js";

export async function listWatchlist(req, res, next) {
  try {
    const list = await Watchlist.find({ userId: req.user._id }).populate("playerId");
    const enrichedList = await Promise.all(
      list
        .filter(item => item.playerId)
        .map(async item => {
          const player = await enrichPlayerDoc(item.playerId);
          return {
            _id: item._id,
            note: item.note,
            addedAt: item.addedAt,
            player
          };
        })
    );
    res.json({ count: enrichedList.length, watchlist: enrichedList });
  } catch (err) {
    next(err);
  }
}

export async function addToWatchlist(req, res, next) {
  try {
    const { playerId, note } = req.body;
    if (!isValidObjectId(playerId)) {
      return res.status(400).json({ error: "A valid playerId is required." });
    }

    // Check if already in watchlist
    const existing = await Watchlist.findOne({ userId: req.user._id, playerId });
    if (existing) {
      existing.note = note || existing.note;
      await existing.save();
      return res.json({ watchlist: existing });
    }

    const item = new Watchlist({
      userId: req.user._id,
      playerId,
      note: note || ""
    });

    await item.save();
    res.status(201).json({ watchlist: item });
  } catch (err) {
    next(err);
  }
}

export async function removeFromWatchlist(req, res, next) {
  try {
    const { playerId } = req.params;
    if (!isValidObjectId(playerId)) {
      return res.status(400).json({ error: "A valid playerId is required." });
    }
    const item = await Watchlist.findOneAndDelete({ userId: req.user._id, playerId });
    if (!item) return res.status(404).json({ error: "Item not found in watchlist." });
    res.json({ success: true, message: "Removed from watchlist." });
  } catch (err) {
    next(err);
  }
}
