const commentsRouter = require("express").Router({ mergeParams: true });
const repairs = require("../services/repairs");
const { requireAuth, loadRepair } = require("../utils/middleware");

// Must be logged in and allowed to see the parent request
commentsRouter.use(requireAuth, loadRepair);

// GET /api/requests/:id/comments  oldest first
commentsRouter.get("/", async (req, res) => {
  res.json(await repairs.listComments(req.repair));
});

// POST /api/requests/:id/comments  { text }
commentsRouter.post("/", async (req, res) => {
  const saved = await repairs.addComment(req.repair, req.user, req.body?.text);
  res.status(201).json(saved);
});

module.exports = commentsRouter;
