import { TacticalBoard } from "../models/index.js";

export async function listBoards(req, res, next) {
  try {
    const boards = await TacticalBoard.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: boards.length, boards });
  } catch (err) {
    next(err);
  }
}

export async function getBoard(req, res, next) {
  try {
    const board = await TacticalBoard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!board) return res.status(404).json({ error: "Tactical board not found." });
    res.json({ board });
  } catch (err) {
    next(err);
  }
}

export async function createBoard(req, res, next) {
  try {
    const { title, formationName, lineup, customSlots, drawings, notes } = req.body;
    if (!title || !formationName) {
      return res.status(400).json({ error: "Title and formationName are required." });
    }

    const board = new TacticalBoard({
      userId: req.user._id,
      title,
      formationName,
      lineup: lineup || [],
      customSlots,
      drawings: drawings || [],
      notes: notes || ""
    });

    await board.save();
    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
}

export async function updateBoard(req, res, next) {
  try {
    const board = await TacticalBoard.findOne({ _id: req.params.id, userId: req.user._id });
    if (!board) return res.status(404).json({ error: "Tactical board not found." });

    const { title, formationName, lineup, customSlots, drawings, notes } = req.body;
    if (title) board.title = title;
    if (formationName) board.formationName = formationName;
    if (lineup) board.lineup = lineup;
    if (customSlots !== undefined) board.customSlots = customSlots;
    if (drawings) board.drawings = drawings;
    if (notes !== undefined) board.notes = notes;

    await board.save();
    res.json({ board });
  } catch (err) {
    next(err);
  }
}

export async function deleteBoard(req, res, next) {
  try {
    const board = await TacticalBoard.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!board) return res.status(404).json({ error: "Tactical board not found." });
    res.json({ success: true, message: "Tactical board deleted successfully." });
  } catch (err) {
    next(err);
  }
}
