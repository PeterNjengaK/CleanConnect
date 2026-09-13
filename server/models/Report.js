const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    category: {
      type: String,
      enum: ["safety", "payment", "no-show", "quality", "harassment", "fraud", "other"],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved", "dismissed"],
      default: "open"
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
