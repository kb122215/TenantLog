const commentsRouter = require("express").Router({ mergeParams: true });
const Comment = require("../models/comment");
const { requireAuth, loadRepair } = require("../utils/middleware");

// Must be logged in and allowed to see the parent request
commentsRouter.use(requireAuth, loadRepair);

// GET /api/requests/:id/comments
commentsRouter.get("/", async (req, res) => {
  const comments = await Comment.find({ request: req.repair._id })
    .sort({ createdAt: 1 })
    .populate("user", { email: 1, name: 1, role: 1 });

  res.json(comments);
});

// POST /api/requests/:id/comments  { text }
commentsRouter.post("/", async (req, res) => {
  const comment = new Comment({
    request: req.repair._id,
    user: req.user._id,
    text: req.body?.text,
  });

  const saved = await comment.save();
  await saved.populate("user", { email: 1, name: 1, role: 1 });
  res.status(201).json(saved);
});

module.exports = commentsRouter;
