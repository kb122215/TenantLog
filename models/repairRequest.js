const mongoose = require("mongoose");

const STATUSES = ["Open", "In Progress", "Resolved"];
const URGENCIES = ["Low", "Medium", "High", "Emergency"];

const statusChangeSchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const repairRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 2000,
    },
    room: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    urgency: {
      type: String,
      enum: URGENCIES,
      default: "Medium",
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "Open",
    },
    photoUrl: {
      type: String,
      trim: true,
    },
    resolvedAt: Date,
    statusHistory: [statusChangeSchema],
  },
  { timestamps: true },
);

repairRequestSchema.index({ user: 1, createdAt: -1 });

repairRequestSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const RepairRequest = mongoose.model("RepairRequest", repairRequestSchema);

module.exports = RepairRequest;
module.exports.STATUSES = STATUSES;
module.exports.URGENCIES = URGENCIES;
