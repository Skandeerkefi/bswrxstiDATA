const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/auth");
const slotChallengeController = require("../controllers/slotChallengeController");

// Public routes
// Search slots (used by admin to select game)
router.get("/slots/search", slotChallengeController.searchSlots);

// Get all challenges (public list)
router.get("/", slotChallengeController.getAllChallenges);

// Get a single challenge by ID
router.get("/:id", slotChallengeController.getChallengeById);

// Get leaderboard for a specific challenge (public)
router.get("/:id/leaderboard", slotChallengeController.getLeaderboard);

// Admin routes (protected)
router.post("/", verifyToken, isAdmin, slotChallengeController.createChallenge);

router.put("/:id", verifyToken, isAdmin, slotChallengeController.updateChallenge);

router.delete("/:id", verifyToken, isAdmin, slotChallengeController.deleteChallenge);

// Refresh leaderboard (admin triggered)
router.post("/:id/refresh", verifyToken, isAdmin, slotChallengeController.refreshLeaderboard);

module.exports = router;