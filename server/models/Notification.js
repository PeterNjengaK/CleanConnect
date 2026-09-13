const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["offer-accepted", "message"], required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    isRead: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, type: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("Notification", notificationSchema);
