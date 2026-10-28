const requestsRouter = require("express").Router();
const repairs = require("../services/repairs");
const { requireAuth, loadRepair } = require("../utils/middleware");

// Every route in this file needs a logged-in user
requestsRouter.use(requireAuth);

// GET /api/requests?status=Open&urgency=High
requestsRouter.get("/", async (req, res) => {
  const { status, urgency } = req.query;
  res.json(await repairs.listRepairs(req.user, { status, urgency }));
});

// GET /api/requests/stats  (before /:id so "stats" isn't treated as an id)
requestsRouter.get("/stats", async (req, res) => {
  res.json(await repairs.getStats(req.user));
});

// POST /api/requests
requestsRouter.post("/", async (req, res) => {
  const saved = await repairs.createRepair(req.user, req.body ?? {});
  res.status(201).json(saved);
});

// GET /api/requests/:id
requestsRouter.get("/:id", loadRepair, (req, res) => {
  res.json(req.repair);
});

// PATCH /api/requests/:id  edit details (owner only)
requestsRouter.patch("/:id", loadRepair, async (req, res) => {
  res.json(await repairs.updateRepair(req.repair, req.user, req.body ?? {}));
});

// PATCH /api/requests/:id/status  { status }
requestsRouter.patch("/:id/status", loadRepair, async (req, res) => {
  res.json(await repairs.changeStatus(req.repair, req.user, req.body?.status));
});

// DELETE /api/requests/:id  cancel (owner only, still Open only)
requestsRouter.delete("/:id", loadRepair, async (req, res) => {
  await repairs.cancelRepair(req.repair, req.user);
  res.status(204).end();
});

module.exports = requestsRouter;
