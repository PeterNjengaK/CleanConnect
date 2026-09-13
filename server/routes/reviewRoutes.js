const express = require("express");
const { protect, customerOnly } = require("../middleware/authMiddleware");
const { createReview, getCleanerReviews } = require("../controllers/reviewController");

const router = express.Router();

router.post("/job/:jobId", protect, customerOnly, createReview);
router.get("/cleaner/:cleanerId", getCleanerReviews);

module.exports = router;
