const requestsRouter = require("express").Router();
const RepairRequest = require("../models/repairRequest");
const Comment = require("../models/comment");
const { requireAuth, loadRepair, isOwner } = require("../utils/middleware");

const { STATUSES, URGENCIES } = RepairRequest;
const EDITABLE_FIELDS = ["title", "description", "room", "urgency", "photoUrl"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Every route in this file needs a logged-in user
requestsRouter.use(requireAuth);

// Tenants only see their own requests; landlords see everyone's
const visibleTo = (user) =>
  user.role === "landlord" ? {} : { user: user._id };

// Copy only the allowed fields out of the request body
const pick = (source, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );

// GET /api/requests?status=Open&urgency=High
requestsRouter.get("/", async (req, res) => {
  const { status, urgency } = req.query;
  const filter = visibleTo(req.user);

  if (status) {
    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    filter.status = status;
  }
  if (urgency) {
    if (!URGENCIES.includes(urgency)) {
      return res
        .status(400)
        .json({ error: `urgency must be one of: ${URGENCIES.join(", ")}` });
    }
    filter.urgency = urgency;
  }

  const repairs = await RepairRequest.find(filter)
    .sort({ createdAt: -1 })
    .populate("user", { email: 1, name: 1 });

  res.json(repairs);
});

// POST /api/requests
requestsRouter.post("/", async (req, res) => {
  const body = req.body ?? {};

  const repair = new RepairRequest({
    ...pick(body, EDITABLE_FIELDS),
    user: req.user._id,
    status: "Open",
    statusHistory: [{ status: "Open", changedBy: req.user._id }],
  });

  const saved = await repair.save();
  res.status(201).json(saved);
});
// GET /api/requests/stats
requestsRouter.get("/stats", async (req, res) => {
  const repairs = await RepairRequest.find(visibleTo(req.user), {
    status: 1,
    createdAt: 1,
    resolvedAt: 1,
  });

  const countsByStatus = Object.fromEntries(
    STATUSES.map((status) => [status, 0]),
  );
  repairs.forEach((repair) => {
    countsByStatus[repair.status] += 1;
  });

  const resolved = repairs.filter(
    (repair) => repair.status === "Resolved" && repair.resolvedAt,
  );
  const totalDays = resolved.reduce(
    (sum, repair) => sum + (repair.resolvedAt - repair.createdAt) / MS_PER_DAY,
    0,
  );

  res.json({
    total: repairs.length,
    countsByStatus,
    resolvedCount: resolved.length,
    averageDaysToFix: resolved.length
      ? Number((totalDays / resolved.length).toFixed(1))
      : null,
  });
});

// GET /api/requests/:id
requestsRouter.get("/:id", loadRepair, (req, res) => {
  res.json(req.repair);
});

// PATCH /api/requests/:id  edit details (owner only)
requestsRouter.patch("/:id", loadRepair, async (req, res) => {
  const { repair } = req;

  if (!isOwner(repair, req.user)) {
    return res.status(403).json({
      error: "Only the tenant who submitted this request can edit it",
    });
  }
  if (repair.status === "Resolved") {
    return res.status(400).json({
      error: "Resolved requests are locked. Reopen it first to make changes.",
    });
  }

  const updates = pick(req.body ?? {}, EDITABLE_FIELDS);
  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ error: `Send at least one of: ${EDITABLE_FIELDS.join(", ")}` });
  }

  repair.set(updates);
  const saved = await repair.save();
  res.json(saved);
});

// PATCH /api/requests/:id/status  { status }  (owner or landlord)
requestsRouter.patch("/:id/status", loadRepair, async (req, res) => {
  const { repair } = req;
  const { status } = req.body ?? {};

  if (!STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${STATUSES.join(", ")}` });
  }
  if (status === repair.status) {
    return res.status(400).json({ error: `Request is already ${status}` });
  }

  repair.status = status;
  repair.resolvedAt = status === "Resolved" ? new Date() : undefined;
  repair.statusHistory.push({ status, changedBy: req.user._id });

  const saved = await repair.save();
  res.json(saved);
});

// DELETE /api/requests/:id  cancel (owner only, still Open only)
requestsRouter.delete("/:id", loadRepair, async (req, res) => {
  const { repair } = req;

  if (!isOwner(repair, req.user)) {
    return res.status(403).json({
      error: "Only the tenant who submitted this request can cancel it",
    });
  }
  if (repair.status !== "Open") {
    return res
      .status(400)
      .json({ error: "Only requests that are still Open can be cancelled" });
  }

  await Comment.deleteMany({ request: repair._id });
  await repair.deleteOne();
  res.status(204).end();
});

module.exports = requestsRouter;
