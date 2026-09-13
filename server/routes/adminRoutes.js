const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getOverview,
  getUsers,
  setUserActive,
  getJobs,
  getAuditLogs,
  setUserRole,
  setUserVerified,
  resetUserPassword,
  updateJob,
  getReviews,
  setReviewVisibility,
  getReports,
  updateReport,
  getJobMessages
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, adminOnly);
router.get("/overview", getOverview);
router.get("/users", getUsers);
router.patch("/users/:userId/active", setUserActive);
router.patch("/users/:userId/role", setUserRole);
router.patch("/users/:userId/verified", setUserVerified);
router.post("/users/:userId/reset-password", resetUserPassword);
router.get("/jobs", getJobs);
router.patch("/jobs/:jobId", updateJob);
router.get("/jobs/:jobId/messages", getJobMessages);
router.get("/reviews", getReviews);
router.patch("/reviews/:reviewId/visibility", setReviewVisibility);
router.get("/reports", getReports);
router.patch("/reports/:reportId", updateReport);
router.get("/audit-logs", getAuditLogs);

module.exports = router;
