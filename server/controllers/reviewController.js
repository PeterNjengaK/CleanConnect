const Job = require("../models/Job");
const Review = require("../models/Review");
const CleanerProfile = require("../models/CleanerProfile");

const createReview = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number from 1 to 5."
      });
    }

    const job = await Job.findOne({
      _id: req.params.jobId,
      customer: req.user._id,
      status: "completed",
      assignedCleaner: { $ne: null }
    });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Only completed jobs can be reviewed."
      });
    }

    const review = await Review.create({
      job: job._id,
      customer: req.user._id,
      cleaner: job.assignedCleaner,
      rating,
      comment: req.body.comment || ""
    });

    const ratingSummary = await Review.aggregate([
      { $match: { cleaner: job.assignedCleaner } },
      { $group: { _id: "$cleaner", rating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }
    ]);
    const summary = ratingSummary[0];
    if (summary) {
      await CleanerProfile.updateOne(
        { user: job.assignedCleaner },
        { $set: { rating: Math.round(summary.rating * 10) / 10, reviewCount: summary.reviewCount } }
      );
    }

    await review.populate("customer", "firstName lastName");
    res.status(201).json({ success: true, message: "Review published.", review });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You already reviewed this job." });
    }
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to publish review." });
  }
};

const getCleanerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      cleaner: req.params.cleanerId,
      isVisible: true
    })
      .populate("customer", "firstName lastName")
      .populate("job", "title serviceType serviceDate")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Cleaner not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to retrieve reviews." });
  }
};

module.exports = { createReview, getCleanerReviews };
