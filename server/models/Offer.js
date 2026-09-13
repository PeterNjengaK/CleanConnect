const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    cleaner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    estimatedHours: {
      type: Number,
      min: 0.5,
      max: 72,
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "withdrawn"],
      default: "pending"
    }
  },
  { timestamps: true }
);

offerSchema.index({ job: 1, cleaner: 1 }, { unique: true });

module.exports = mongoose.model("Offer", offerSchema);
