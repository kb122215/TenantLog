const RepairRequest = require("../models/repairRequest");

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "You need to log in first" });
};

//  true if this user submitted the request
const isOwner = (repair, user) => {
  const ownerId = repair.user?._id ?? repair.user;
  return Boolean(ownerId) && ownerId.equals(user._id);
};

// the owner or any landlord can see a request
const canView = (repair, user) => {
  if (user.role === "landlord") return true;
  return isOwner(repair, user);
};

//  loads the request from :id, checks access, and saves it on req.repair
const loadRepair = async (req, res, next) => {
  const repair = await RepairRequest.findById(req.params.id).populate("user", {
    email: 1,
    name: 1,
    role: 1,
  });

  if (!repair || !canView(repair, req.user)) {
    return res.status(404).json({ error: "Repair request not found" });
  }

  req.repair = repair;
  next();
};

const unknownEndpoint = (req, res) => {
  res.status(404).json({ error: "unknown endpoint" });
};

const errorHandler = (error, req, res, next) => {
  console.error(error.message);

  if (error.name === "CastError") {
    return res.status(400).json({ error: "malformatted id" });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ error: error.message });
  }
  if (error.name === "MongoServerError" && error.code === 11000) {
    return res.status(400).json({ error: "That email is already registered" });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }

  next(error);
};

module.exports = {
  requireAuth,
  loadRepair,
  isOwner,
  unknownEndpoint,
  errorHandler,
};
