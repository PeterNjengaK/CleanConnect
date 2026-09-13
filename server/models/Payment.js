const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cleaner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, min: 1, required: true },
    platformFee: { type: Number, min: 0, required: true },
    currency: { type: String, default: "usd", lowercase: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially-refunded"],
      default: "pending"
    },
    stripeCheckoutSessionId: { type: String, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, unique: true, sparse: true },
    stripeChargeId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
