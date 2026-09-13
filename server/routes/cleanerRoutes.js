const express = require("express");

const {
  getMyProfile,
  saveMyProfile,
  getPublicCleaners,
  getPublicCleanerById
} = require("../controllers/cleanerController");

const {
  protect,
  cleanerOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/public",
  getPublicCleaners
);

router.get(
  "/public/:id",
  getPublicCleanerById
);

router.get(
  "/profile",
  protect,
  cleanerOnly,
  getMyProfile
);

router.put(
  "/profile",
  protect,
  cleanerOnly,
  saveMyProfile
);

module.exports = router;