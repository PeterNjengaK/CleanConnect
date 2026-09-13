const express = require("express");

const {
  createJob,
  getMyJobs,
  getAvailableJobs,
  createOffer,
  getJobOffers,
  acceptOffer,
  getAssignedJobs,
  updateJobStatus,
  cancelJob
} = require("../controllers/jobController");

const {
  protect,
  customerOnly,
  cleanerOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  customerOnly,
  createJob
);

router.get(
  "/mine",
  protect,
  customerOnly,
  getMyJobs
);

router.get(
  "/available",
  protect,
  cleanerOnly,
  getAvailableJobs
);

router.get(
  "/assigned",
  protect,
  cleanerOnly,
  getAssignedJobs
);

router.post(
  "/:jobId/offers",
  protect,
  cleanerOnly,
  createOffer
);

router.get(
  "/:jobId/offers",
  protect,
  customerOnly,
  getJobOffers
);

router.patch(
  "/:jobId/offers/:offerId/accept",
  protect,
  customerOnly,
  acceptOffer
);

router.patch(
  "/:jobId/status",
  protect,
  cleanerOnly,
  updateJobStatus
);

router.patch(
  "/:jobId/cancel",
  protect,
  customerOnly,
  cancelJob
);

module.exports = router;
