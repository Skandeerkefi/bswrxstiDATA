const { LeaderboardSettings } = require("../models/LeaderboardSettings");

// Get current leaderboard settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await LeaderboardSettings.findOne().sort({ createdAt: -1 });
    
    // Create default settings if none exist
    if (!settings) {
      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      settings = await LeaderboardSettings.create({
        isActive: true,
        title: "Weekly Leaderboard",
        description: "Compete for prizes by wagering on your favorite games!",
        periodType: "biweekly",
        timezone: "America/New_York",
        currentPeriodStart: now,
        currentPeriodEnd: twoWeeksLater,
        prizes: [
          { position: 1, prize: "$500", currency: "USD" },
          { position: 2, prize: "$300", currency: "USD" },
          { position: 3, prize: "$200", currency: "USD" },
          { position: 4, prize: "$100", currency: "USD" },
          { position: 5, prize: "$50", currency: "USD" },
        ],
        minWager: 100,
        categories: "slots",
        autoTransition: true,
        transitionHour: 0,
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Failed to get leaderboard settings" });
  }
};

// Update leaderboard settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      isActive,
      title,
      description,
      periodType,
      timezone,
      currentPeriodStart,
      currentPeriodEnd,
      prizes,
      minWager,
      categories,
      autoTransition,
      transitionHour,
    } = req.body;

    let settings = await LeaderboardSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      settings = new LeaderboardSettings();
    }

    // Archive current period to previous if dates are changing
    if (settings.currentPeriodStart && settings.currentPeriodEnd) {
      const oldStart = new Date(settings.currentPeriodStart).getTime();
      const oldEnd = new Date(settings.currentPeriodEnd).getTime();
      const newStart = new Date(currentPeriodStart).getTime();
      const newEnd = new Date(currentPeriodEnd).getTime();

      // If the period end has passed and we're setting new dates, archive old period
      if (oldEnd < Date.now() && (oldStart !== newStart || oldEnd !== newEnd)) {
        settings.previousPeriods = settings.previousPeriods || [];
        settings.previousPeriods.push({
          startDate: settings.currentPeriodStart,
          endDate: settings.currentPeriodEnd,
          title: settings.title,
          prizes: settings.prizes,
        });
        // Keep only last 10 previous periods
        if (settings.previousPeriods.length > 10) {
          settings.previousPeriods = settings.previousPeriods.slice(-10);
        }
      }
    }

    // Update fields
    if (isActive !== undefined) settings.isActive = isActive;
    if (title !== undefined) settings.title = title;
    if (description !== undefined) settings.description = description;
    if (periodType !== undefined) settings.periodType = periodType;
    if (timezone !== undefined) settings.timezone = timezone;
    if (currentPeriodStart !== undefined) settings.currentPeriodStart = new Date(currentPeriodStart);
    if (currentPeriodEnd !== undefined) settings.currentPeriodEnd = new Date(currentPeriodEnd);
    if (prizes !== undefined) settings.prizes = prizes;
    if (minWager !== undefined) settings.minWager = minWager;
    if (categories !== undefined) settings.categories = categories;
    if (autoTransition !== undefined) settings.autoTransition = autoTransition;
    if (transitionHour !== undefined) settings.transitionHour = transitionHour;

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update leaderboard settings" });
  }
};

// Get previous periods
exports.getPreviousPeriods = async (req, res) => {
  try {
    const settings = await LeaderboardSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      return res.json([]);
    }
    
    res.json(settings.previousPeriods || []);
  } catch (error) {
    console.error("Get previous periods error:", error);
    res.status(500).json({ error: "Failed to get previous periods" });
  }
};

// Get current period info (for public access)
exports.getCurrentPeriod = async (req, res) => {
  try {
    const settings = await LeaderboardSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      return res.json({
        periodType: "biweekly",
        timezone: "America/New_York",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        prizes: [],
      });
    }
    
    res.json({
      isActive: settings.isActive,
      title: settings.title,
      description: settings.description,
      periodType: settings.periodType,
      timezone: settings.timezone,
      currentPeriodStart: settings.currentPeriodStart,
      currentPeriodEnd: settings.currentPeriodEnd,
      prizes: settings.prizes,
      minWager: settings.minWager,
    });
  } catch (error) {
    console.error("Get current period error:", error);
    res.status(500).json({ error: "Failed to get current period" });
  }
};

// Advance to next period (manual trigger)
exports.advanceToNextPeriod = async (req, res) => {
  try {
    const settings = await LeaderboardSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      return res.status(404).json({ error: "No settings found" });
    }

    // Archive current period
    settings.previousPeriods = settings.previousPeriods || [];
    settings.previousPeriods.push({
      startDate: settings.currentPeriodStart,
      endDate: settings.currentPeriodEnd,
      title: settings.title,
      prizes: settings.prizes,
    });

    // Keep only last 10 previous periods
    if (settings.previousPeriods.length > 10) {
      settings.previousPeriods = settings.previousPeriods.slice(-10);
    }

    // Calculate next period based on period type
    const start = new Date(settings.currentPeriodEnd);
    
    switch (settings.periodType) {
      case 'daily':
        start.setDate(start.getDate() + 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() + 7);
        break;
      case 'biweekly':
        start.setDate(start.getDate() + 14);
        break;
      default:
        start.setDate(start.getDate() + 14);
    }

    const end = new Date(start);
    switch (settings.periodType) {
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'biweekly':
        end.setDate(end.getDate() + 14);
        break;
      default:
        end.setDate(end.getDate() + 14);
    }

    settings.currentPeriodStart = start;
    settings.currentPeriodEnd = end;
    
    await settings.save();
    
    res.json({
      message: "Advanced to next period",
      newPeriod: {
        start: settings.currentPeriodStart,
        end: settings.currentPeriodEnd,
      },
      settings,
    });
  } catch (error) {
    console.error("Advance period error:", error);
    res.status(500).json({ error: "Failed to advance to next period" });
  }
};