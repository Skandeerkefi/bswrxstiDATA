const mongoose = require("mongoose");

const prizeSchema = new mongoose.Schema({
	position: { type: Number, required: true },
	prize: { type: String, required: true },
	currency: { type: String, default: "USD" },
}, { _id: false });

const leaderboardSettingsSchema = new mongoose.Schema({
	isActive: { type: Boolean, default: true },
	title: { type: String, default: "Weekly Leaderboard" },
	description: { type: String, default: "" },
	
	// Time settings
	periodType: { type: String, enum: ['daily', 'weekly', 'biweekly', 'custom'], default: 'biweekly' },
	timezone: { type: String, default: 'America/New_York' }, // EST
	
	// Current period dates
	currentPeriodStart: { type: Date, required: true },
	currentPeriodEnd: { type: Date, required: true },
	
	// Prize structure
	prizes: { type: [prizeSchema], default: [] },
	
	// Min wager requirement
	minWager: { type: Number, default: 0 },
	
	// Categories included (e.g., slots, all)
	categories: { type: String, default: "slots" },
	
	// Previous period data (for archive)
	previousPeriods: [{
		startDate: Date,
		endDate: Date,
		title: String,
		prizes: [prizeSchema],
		createdAt: { type: Date, default: Date.now }
	}],
	
	// Auto-transition settings
	autoTransition: { type: Boolean, default: true },
	transitionHour: { type: Number, default: 0 }, // Hour of day to transition (0 = midnight)
	
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const LeaderboardSettings = mongoose.model("LeaderboardSettings", leaderboardSettingsSchema);

module.exports = { LeaderboardSettings };