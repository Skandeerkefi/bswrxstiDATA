const express = require("express");
const router = express.Router();
const leaderboardSettingsController = require("../controllers/leaderboardSettingsController");

// Public routes
router.get("/current", leaderboardSettingsController.getCurrentPeriod);

// Admin routes (should be protected by auth middleware in production)
router.get("/", leaderboardSettingsController.getSettings);
router.put("/", leaderboardSettingsController.updateSettings);
router.get("/previous", leaderboardSettingsController.getPreviousPeriods);
router.post("/advance", leaderboardSettingsController.advanceToNextPeriod);

module.exports = router;