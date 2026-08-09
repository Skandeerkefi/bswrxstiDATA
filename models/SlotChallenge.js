const mongoose = require("mongoose");

const challengeResultSchema = new mongoose.Schema(
	{
		uid: { type: String, required: true, index: true },
		username: { type: String, required: true },
		wagered: { type: Number, default: 0 },
		weightedWagered: { type: Number, default: 0 },
		favoriteGameId: { type: String, default: "" },
		favoriteGameTitle: { type: String, default: "" },
		rankLevel: { type: Number, default: 0 },
		rankLevelImage: { type: String, default: "" },
		highestMultiplier: {
			multiplier: { type: Number, default: 0 },
			wagered: { type: Number, default: 0 },
			payout: { type: Number, default: 0 },
			gameId: { type: String, default: "" },
			gameTitle: { type: String, default: "" },
		},
		isWinner: { type: Boolean, default: false },
		winnerRank: { type: Number, default: null },
		qualifiedAt: { type: Date, default: null },
		updatedAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const slotChallengeSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, default: "Slot Challenge" },
		gameId: { type: String, default: null },
		gameTitle: { type: String, required: true },
		gameImageUrl: { type: String, default: "" },
		gameProvider: { type: String, default: "" },
		minBet: { type: Number, required: true, default: 0.2 },
		targetMultiplier: { type: Number, required: true, default: 1000 },
		winnerCount: { type: Number, required: true, default: 3 },
		winnerSelectionMode: { type: String, enum: ['firstComeFirstServed', 'topPerformers'], default: 'firstComeFirstServed' },
		isActive: { type: Boolean, default: true },
		status: { type: String, enum: ['active', 'upcoming', 'ended'], default: 'active' },
		startDate: { type: Date, default: Date.now },
		endDate: { type: Date, default: null },
		lastSyncedAt: { type: Date, default: null },
		nextSyncAt: { type: Date, default: null },
		leaderboard: { type: [challengeResultSchema], default: [] },
	},
	{ timestamps: true }
);

const SlotChallenge = mongoose.model("SlotChallenge", slotChallengeSchema);

module.exports = { SlotChallenge };