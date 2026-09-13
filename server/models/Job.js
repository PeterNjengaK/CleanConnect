const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    serviceType: {
      type: String,
      required: true,
      enum: [
        "House Cleaning",
        "Deep Cleaning",
        "Office Cleaning",
        "Move-In Cleaning",
        "Move-Out Cleaning",
        "Airbnb Cleaning",
        "Window Cleaning",
        "Carpet Cleaning"
      ]
    },

    description: {
      type: String,
      required: true,
      maxlength: 2000
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    state: {
      type: String,
      required: true,
      trim: true
    },

    address: {
      type: String,
      trim: true,
      default: ""
    },

    serviceDate: {
      type: Date,
      required: true
    },

    preferredTime: {
      type: String,
      trim: true,
      default: ""
    },

    budgetMin: {
      type: Number,
      min: 0,
      required: true
    },

    budgetMax: {
      type: Number,
      min: 0,
      required: true
    },

    propertyType: {
      type: String,
      enum: [
        "House",
        "Apartment",
        "Office",
        "Airbnb",
        "Commercial",
        "Other"
      ],
      default: "House"
    },

    bedrooms: {
      type: Number,
      min: 0,
      default: 0
    },

    bathrooms: {
      type: Number,
      min: 0,
      default: 0
    },

    status: {
      type: String,
      enum: [
        "open",
        "assigned",
        "in-progress",
        "completed",
        "cancelled"
      ],
      default: "open"
    },

    assignedCleaner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    agreedAmount: {
      type: Number,
      min: 0,
      default: null
    },

    paymentStatus: {
      type: String,
      enum: ["not-required", "unpaid", "pending", "paid", "refunded", "failed"],
      default: "not-required"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Job", jobSchema);
