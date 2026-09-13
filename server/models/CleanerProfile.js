const mongoose = require("mongoose");

const cleanerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    businessName: {
      type: String,
      required: true,
      trim: true
    },

    bio: {
      type: String,
      maxlength: 1000,
      default: ""
    },

    yearsExperience: {
      type: Number,
      min: 0,
      default: 0
    },

    services: [
      {
        type: String,
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
      }
    ],

    startingPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    pricingType: {
      type: String,
      enum: ["hourly", "flat", "starting-at"],
      default: "starting-at"
    },

    serviceCity: {
      type: String,
      trim: true
    },

    serviceState: {
      type: String,
      trim: true
    },

    serviceRadius: {
      type: Number,
      min: 1,
      default: 25
    },

    availableDays: [
      {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ]
      }
    ],

    profileImage: {
      type: String,
      default: ""
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },

    reviewCount: {
      type: Number,
      default: 0
    },

    completedJobs: {
      type: Number,
      default: 0
    },

    isProfileComplete: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "CleanerProfile",
  cleanerProfileSchema
);