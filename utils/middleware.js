const HttpError = require("./httpError");
const { findRepairFor } = require("../services/repairs");

// API guard: blocks the route unless someone is logged in
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "You need to log in first" });
};

// Loads the repair request from :id, checks access, and attaches it as req.repair.
// If it's missing or not yours, findRepairFor throws a 404 HttpError.
const loadRepair = async (req, res, next) => {
  req.repair = await findRepairFor(req.params.id, req.user);
  next();
};

const unknownEndpoint = (req, res) => {
  // A person typing a bad address gets a page; anything under /api gets JSON
  if (!req.path.startsWith("/api") && req.accepts("html")) {
    return res
      .status(404)
      .render("error", { status: 404, message: "That page does not exist." });
  }
  res.status(404).json({ error: "unknown endpoint" });
};

// Turns errors into JSON responses for the API (pages have their own handler)
const errorHandler = (error, req, res, next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error.message);

  if (error.name === "CastError") {
    return res.status(400).json({ error: "malformatted id" });
  }
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(
      (detail) => detail.message,
    );
    return res.status(400).json({ error: messages.join(". ") });
  }
  if (error.name === "MongoServerError" && error.code === 11000) {
    return res.status(400).json({ error: "That email is already registered" });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }

  next(error);
};

module.exports = { requireAuth, loadRepair, unknownEndpoint, errorHandler };
