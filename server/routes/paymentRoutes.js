const express = require("express");
const {
  getPaymentConfig,
  createConnectOnboardingLink,
  getConnectStatus,
  createCheckoutSession,
  getJobPayment
} = require("../controllers/paymentController");
const { protect, cleanerOnly, customerOnly } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/config", protect, getPaymentConfig);
router.get("/connect/status", protect, cleanerOnly, getConnectStatus);
router.post("/connect/onboarding", protect, cleanerOnly, createConnectOnboardingLink);
router.post("/jobs/:jobId/checkout", protect, customerOnly, createCheckoutSession);
router.get("/jobs/:jobId", protect, getJobPayment);

module.exports = router;
