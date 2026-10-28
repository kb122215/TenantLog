const RepairRequest = require("../models/repairRequest");
const Comment = require("../models/comment");
const HttpError = require("../utils/httpError");

const { STATUSES, URGENCIES } = RepairRequest;
const EDITABLE_FIELDS = ["title", "description", "room", "urgency", "photoUrl"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PERSON_FIELDS = { email: 1, name: 1, role: 1 };

// ---------- Helpers ----------

// Tenants only see their own requests; landlords see everyone's
const visibleTo = (user) =>
  user.role === "landlord" ? {} : { user: user._id };

// Copy only the allowed fields so nobody can set user, status, etc. through a form or body
const pick = (source, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );

const isOwner = (repair, user) => {
  // repair.user may or may not be populated, so handle both shapes
  const ownerId = repair.user?._id ?? repair.user;
  return Boolean(ownerId) && ownerId.equals(user._id);
};

const canView = (repair, user) =>
  user.role === "landlord" || isOwner(repair, user);

const canEdit = (repair, user) =>
  isOwner(repair, user) && repair.status !== "Resolved";

const canCancel = (repair, user) =>
  isOwner(repair, user) && repair.status === "Open";

// ---------- Requests ----------

const findRepairFor = async (id, user) => {
  const repair = await RepairRequest.findById(id)
    .populate("user", PERSON_FIELDS)
    .populate("statusHistory.changedBy", PERSON_FIELDS);

  // 404 for "doesn't exist" and "not yours" alike, so ids can't be probed
  if (!repair || !canView(repair, user)) {
    throw new HttpError(404, "Repair request not found");
  }
  return repair;
};

const listRepairs = async (user, { status, urgency } = {}) => {
  const filter = visibleTo(user);

  if (status) {
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${STATUSES.join(", ")}`);
    }
    filter.status = status;
  }
  if (urgency) {
    if (!URGENCIES.includes(urgency)) {
      throw new HttpError(
        400,
        `urgency must be one of: ${URGENCIES.join(", ")}`,
      );
    }
    filter.urgency = urgency;
  }

  return RepairRequest.find(filter)
    .sort({ createdAt: -1 })
    .populate("user", { email: 1, name: 1 });
};

const getStats = async (user) => {
  const repairs = await RepairRequest.find(visibleTo(user), {
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

  return {
    total: repairs.length,
    countsByStatus,
    resolvedCount: resolved.length,
    averageDaysToFix: resolved.length
      ? Number((totalDays / resolved.length).toFixed(1))
      : null,
  };
};

const createRepair = (user, body = {}) =>
  new RepairRequest({
    ...pick(body, EDITABLE_FIELDS),
    user: user._id,
    status: "Open",
    statusHistory: [{ status: "Open", changedBy: user._id }],
  }).save();

const updateRepair = (repair, user, body = {}) => {
  if (!isOwner(repair, user)) {
    throw new HttpError(
      403,
      "Only the tenant who submitted this request can edit it",
    );
  }
  if (repair.status === "Resolved") {
    throw new HttpError(
      400,
      "Resolved requests are locked. Reopen it first to make changes.",
    );
  }

  const updates = pick(body, EDITABLE_FIELDS);
  if (Object.keys(updates).length === 0) {
    throw new HttpError(
      400,
      `Send at least one of: ${EDITABLE_FIELDS.join(", ")}`,
    );
  }

  repair.set(updates);
  return repair.save(); // save() runs the schema validators
};

const changeStatus = (repair, user, status) => {
  if (!STATUSES.includes(status)) {
    throw new HttpError(400, `status must be one of: ${STATUSES.join(", ")}`);
  }
  if (status === repair.status) {
    throw new HttpError(400, `Request is already ${status}`);
  }

  repair.status = status;
  repair.resolvedAt = status === "Resolved" ? new Date() : undefined;
  repair.statusHistory.push({ status, changedBy: user._id });
  return repair.save();
};

const cancelRepair = async (repair, user) => {
  if (!isOwner(repair, user)) {
    throw new HttpError(
      403,
      "Only the tenant who submitted this request can cancel it",
    );
  }
  // Once work has started the record stays, so the paper trail can't be erased
  if (repair.status !== "Open") {
    throw new HttpError(
      400,
      "Only requests that are still Open can be cancelled",
    );
  }

  await Comment.deleteMany({ request: repair._id });
  await repair.deleteOne();
};

// ---------- Comments ----------

const listComments = (repair) =>
  Comment.find({ request: repair._id })
    .sort({ createdAt: 1 })
    .populate("user", PERSON_FIELDS);

const addComment = async (repair, user, text) => {
  const saved = await new Comment({
    request: repair._id,
    user: user._id,
    text,
  }).save();
  return saved.populate("user", PERSON_FIELDS);
};

module.exports = {
  STATUSES,
  URGENCIES,
  isOwner,
  canEdit,
  canCancel,
  findRepairFor,
  listRepairs,
  getStats,
  createRepair,
  updateRepair,
  changeStatus,
  cancelRepair,
  listComments,
  addComment,
};
