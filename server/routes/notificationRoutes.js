const express = require("express");
const { getMyNotifications, markNotificationRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/", protect, getMyNotifications);
router.patch("/:notificationId/read", protect, markNotificationRead);

module.exports = router;
