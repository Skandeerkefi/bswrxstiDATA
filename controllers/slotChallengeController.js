const axios = require("axios");
const { SlotChallenge } = require("../models/SlotChallenge");

// Helper function to blur usernames
function blurUsername(username) {
  if (!username || username.length <= 2) return "***";
  const firstChar = username.charAt(0);
  const lastChar = username.charAt(username.length - 1);
  const blurredPart = "*".repeat(Math.max(0, username.length - 2));
  return firstChar + blurredPart + lastChar;
}

// Helper function to normalize game titles for comparison
const normalizeGameTitle = (title) => {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Helper function to check if two game titles match
const gameTitlesMatch = (title1, title2) => {
  return normalizeGameTitle(title1) === normalizeGameTitle(title2);
};

// Filter out dice from house games
function filterDice(player) {
  if (!player.favoriteGameId) return true;
  return !player.favoriteGameId.includes("housegames:dice");
}

// Fetch stats from Roobet Affiliate Stats API using the same pattern as leaderboardController
const fetchRoobetStats = async (startDate, endDate, gameIdentifiers = null) => {
  const params = {
    userId: process.env.USER_ID,
  };

  if (startDate) params.startDate = startDate instanceof Date ? startDate.toISOString() : startDate;
  if (endDate) params.endDate = endDate instanceof Date ? endDate.toISOString() : endDate;
  
  if (gameIdentifiers) {
    params.gameIdentifiers = gameIdentifiers;
  } else {
    params.categories = "slots,provably fair"; // Only Slots & Provably Fair
  }

  const response = await axios.get(
    `${process.env.API_BASE_URL}/affiliate/v2/stats`,
    {
      params,
      headers: {
        Authorization: `Bearer ${process.env.ROOBET_API_KEY}`,
      },
    }
  );

  // Process data similar to leaderboardController
  // Log raw data count for debugging
  console.log(`Roobet API returned ${response.data.length} players`);
  
  const filteredData = response.data
    .filter(filterDice)
    .filter(player => player.highestMultiplier && player.highestMultiplier.multiplier > 0);
  
  console.log(`After filtering: ${filteredData.length} players`);
  
  return filteredData
    .map((player) => ({
      uid: player.uid,
      username: blurUsername(player.username),
      wagered: player.wagered || 0,
      weightedWagered: player.weightedWagered || 0,
      favoriteGameId: player.favoriteGameId || "",
      favoriteGameTitle: player.favoriteGameTitle || "",
      rankLevel: player.rankLevel || 0,
      rankLevelImage: player.rankLevelImage || "",
      highestMultiplier: {
        multiplier: player.highestMultiplier?.multiplier || 0,
        wagered: player.highestMultiplier?.wagered || 0,
        payout: player.highestMultiplier?.payout || 0,
        gameId: player.highestMultiplier?.gameId || "",
        gameTitle: player.highestMultiplier?.gameTitle || "",
      },
    }));
};

// Search slots using the bonus hunt API
exports.searchSlots = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Use Roobet site to get correct game names
    const searchUrl = `https://bonushunt.gg/api/slots?q=${encodeURIComponent(q)}&site=Roobet`;
    const response = await axios.get(searchUrl);
    
    const data = response.data;
    
    // Get the slots array - handle various response formats
    let slotsArray = [];
    if (Array.isArray(data)) {
      slotsArray = data;
    } else if (data.slots && Array.isArray(data.slots)) {
      slotsArray = data.slots;
    } else if (data.results && Array.isArray(data.results)) {
      slotsArray = data.results;
    }
    
    // Normalize the response: { name, image, url, provider }
    const normalizedResults = slotsArray.map((slot) => {
      return {
        name: slot.slotName || slot.name || slot.title || '',
        image: slot.image || '',
        url: slot.url || '',
        provider: slot.provider || '',
      };
    });
    
    res.json(normalizedResults);
  } catch (error) {
    console.error("Slot search error:", error);
    res.status(500).json({ error: "Failed to search slots" });
  }
};

// Create a new slot challenge
exports.createChallenge = async (req, res) => {
  try {
    const { title, gameId, gameTitle, gameImageUrl, gameProvider, minBet, targetMultiplier, winnerCount, winnerSelectionMode, startDate, endDate } = req.body;

    if (!gameTitle) {
      return res.status(400).json({ error: "Game title is required" });
    }

    const challenge = new SlotChallenge({
      title: title || `Slot Challenge - ${gameTitle}`,
      gameId: gameId || null,
      gameTitle,
      gameImageUrl: gameImageUrl || "",
      gameProvider: gameProvider || "",
      minBet: minBet || 0.2,
      targetMultiplier: targetMultiplier || 1000,
      winnerCount: winnerCount || 3,
      winnerSelectionMode: winnerSelectionMode || "firstComeFirstServed",
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      status: new Date() >= new Date(startDate) ? "active" : "upcoming",
    });

    await challenge.save();
    res.status(201).json(challenge);
  } catch (error) {
    console.error("Create challenge error:", error);
    res.status(500).json({ error: "Failed to create challenge" });
  }
};

// Get all challenges
exports.getAllChallenges = async (req, res) => {
  try {
    const { status, isActive } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const challenges = await SlotChallenge.find(filter).sort({ createdAt: -1 });
    res.json(challenges);
  } catch (error) {
    console.error("Get challenges error:", error);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
};

// Get a single challenge by ID
exports.getChallengeById = async (req, res) => {
  try {
    const challenge = await SlotChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    res.json(challenge);
  } catch (error) {
    console.error("Get challenge error:", error);
    res.status(500).json({ error: "Failed to fetch challenge" });
  }
};

// Update a challenge
exports.updateChallenge = async (req, res) => {
  try {
    const { title, gameId, gameTitle, gameImageUrl, gameProvider, minBet, targetMultiplier, winnerCount, winnerSelectionMode, isActive, status, startDate, endDate } = req.body;

    const challenge = await SlotChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (title !== undefined) challenge.title = title;
    if (gameId !== undefined) challenge.gameId = gameId;
    if (gameTitle !== undefined) challenge.gameTitle = gameTitle;
    if (gameImageUrl !== undefined) challenge.gameImageUrl = gameImageUrl;
    if (gameProvider !== undefined) challenge.gameProvider = gameProvider;
    if (minBet !== undefined) challenge.minBet = minBet;
    if (targetMultiplier !== undefined) challenge.targetMultiplier = targetMultiplier;
    if (winnerCount !== undefined) challenge.winnerCount = winnerCount;
    if (winnerSelectionMode !== undefined) challenge.winnerSelectionMode = winnerSelectionMode;
    if (isActive !== undefined) challenge.isActive = isActive;
    if (status !== undefined) challenge.status = status;
    if (startDate !== undefined) challenge.startDate = new Date(startDate);
    if (endDate !== undefined) challenge.endDate = endDate ? new Date(endDate) : null;

    await challenge.save();
    res.json(challenge);
  } catch (error) {
    console.error("Update challenge error:", error);
    res.status(500).json({ error: "Failed to update challenge" });
  }
};

// Delete a challenge
exports.deleteChallenge = async (req, res) => {
  try {
    const challenge = await SlotChallenge.findByIdAndDelete(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    res.json({ message: "Challenge deleted successfully" });
  } catch (error) {
    console.error("Delete challenge error:", error);
    res.status(500).json({ error: "Failed to delete challenge" });
  }
};

// Refresh leaderboard for a specific challenge
exports.refreshLeaderboard = async (req, res) => {
  try {
    const challenge = await SlotChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (challenge.status === "ended") {
      return res.status(400).json({ error: "Cannot refresh ended challenge" });
    }

    try {
      const result = await syncChallengeLeaderboard(challenge);
      res.json({
        message: "Leaderboard refreshed successfully",
        stats: result,
        challenge,
      });
    } catch (syncError) {
      console.error("Sync error:", syncError);
      res.status(500).json({ 
        error: "Failed to sync with Roobet API",
        details: syncError.message 
      });
    }
  } catch (error) {
    console.error("Refresh leaderboard error:", error);
    res.status(500).json({ error: "Failed to refresh leaderboard" });
  }
};

// Core function to sync a challenge's leaderboard with Roobet API
const syncChallengeLeaderboard = async (challenge) => {
  const startDate = challenge.startDate;
  const endDate = challenge.endDate || new Date();
  
  let roobetData;
  
  try {
    if (challenge.gameId) {
      roobetData = await fetchRoobetStats(
        startDate,
        endDate,
        challenge.gameId
      );
    } else {
      roobetData = await fetchRoobetStats(
        startDate,
        endDate
      );
    }
  } catch (error) {
    console.error("Error fetching Roobet data:", error);
    throw error;
  }

  let gameIdResolved = !!challenge.gameId;
  let newGameId = challenge.gameId;
  const updatedLeaderboard = [];
  
  for (const userData of roobetData) {
    const userHighestMultiplier = userData.highestMultiplier;
    
    if (!userHighestMultiplier || !userHighestMultiplier.gameTitle) {
      continue;
    }

    if (!gameIdResolved && gameTitlesMatch(userHighestMultiplier.gameTitle, challenge.gameTitle)) {
      newGameId = userHighestMultiplier.gameId;
      gameIdResolved = true;
      console.log(`Resolved game ID for "${challenge.gameTitle}": ${newGameId}`);
    }

    const isForTargetGame = 
      gameTitlesMatch(userHighestMultiplier.gameTitle, challenge.gameTitle) ||
      userHighestMultiplier.gameId === challenge.gameId;

    if (!isForTargetGame) {
      continue;
    }

    const qualifies = userHighestMultiplier.wagered >= challenge.minBet;
    const existingEntry = challenge.leaderboard.find((r) => r.uid === userData.uid);
    const isNewWinner = qualifies && 
      userHighestMultiplier.multiplier >= challenge.targetMultiplier &&
      (!existingEntry || !existingEntry.isWinner);

    let isWinner = existingEntry?.isWinner || false;
    let winnerRank = existingEntry?.winnerRank || null;
    let qualifiedAt = existingEntry?.qualifiedAt || null;

    if (isNewWinner) {
      const filledSlots = challenge.leaderboard.filter((r) => r.isWinner).length;
      if (filledSlots < challenge.winnerCount) {
        isWinner = true;
        winnerRank = filledSlots + 1;
        qualifiedAt = new Date();
        console.log(`New winner: ${userData.username} (${userData.uid}) - Rank ${winnerRank}`);
      }
    }

    const entry = {
      uid: userData.uid,
      username: userData.username,
      wagered: userData.wagered || 0,
      weightedWagered: userData.weightedWagered || 0,
      favoriteGameId: userData.favoriteGameId || "",
      favoriteGameTitle: userData.favoriteGameTitle || "",
      rankLevel: userData.rankLevel || 0,
      rankLevelImage: userData.rankLevelImage || "",
      highestMultiplier: {
        multiplier: userHighestMultiplier.multiplier || 0,
        wagered: userHighestMultiplier.wagered || 0,
        payout: userHighestMultiplier.payout || 0,
        gameId: userHighestMultiplier.gameId || "",
        gameTitle: userHighestMultiplier.gameTitle || "",
      },
      isWinner,
      winnerRank,
      qualifiedAt,
      updatedAt: new Date(),
    };

    updatedLeaderboard.push(entry);
  }

  updatedLeaderboard.sort((a, b) => 
    b.highestMultiplier.multiplier - a.highestMultiplier.multiplier
  );

  if (challenge.winnerSelectionMode === "topPerformers") {
    const winners = updatedLeaderboard.filter((r) => r.isWinner);
    winners.forEach((w, idx) => {
      w.winnerRank = idx + 1;
    });
  }

  if (gameIdResolved && newGameId !== challenge.gameId) {
    challenge.gameId = newGameId;
  }
  
  challenge.leaderboard = updatedLeaderboard;
  challenge.lastSyncedAt = new Date();
  challenge.nextSyncAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  
  await challenge.save();

  return {
    usersProcessed: roobetData.length,
    leaderboardEntries: updatedLeaderboard.length,
    winnersCount: updatedLeaderboard.filter((r) => r.isWinner).length,
    gameIdResolved,
  };
};

// Sync all active challenges
exports.syncAllActiveChallenges = async () => {
  console.log("Starting sync for all active challenges...");
  
  const challenges = await SlotChallenge.find({ 
    isActive: true, 
    status: "active" 
  });

  const results = [];
  
  for (const challenge of challenges) {
    try {
      const shouldSync = !challenge.nextSyncAt || new Date() >= challenge.nextSyncAt;
      
      if (shouldSync) {
        console.log(`Syncing challenge: ${challenge.title} (${challenge._id})`);
        const result = await syncChallengeLeaderboard(challenge);
        results.push({ challengeId: challenge._id, success: true, ...result });
      }
    } catch (error) {
      console.error(`Error syncing challenge ${challenge._id}:`, error);
      results.push({ challengeId: challenge._id, success: false, error: error.message });
    }
  }
  
  console.log(`Sync completed. Processed ${results.length} challenges.`);
  return results;
};

// Get leaderboard for a specific challenge (public)
exports.getLeaderboard = async (req, res) => {
  try {
    const challenge = await SlotChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const sortedLeaderboard = [...challenge.leaderboard].sort(
      (a, b) => b.highestMultiplier.multiplier - a.highestMultiplier.multiplier
    );

    const leaderboardWithRanks = sortedLeaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    res.json({
      challenge: {
        _id: challenge._id,
        title: challenge.title,
        gameTitle: challenge.gameTitle,
        gameImageUrl: challenge.gameImageUrl,
        minBet: challenge.minBet,
        targetMultiplier: challenge.targetMultiplier,
        winnerCount: challenge.winnerCount,
        status: challenge.status,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
      },
      leaderboard: leaderboardWithRanks,
      lastSyncedAt: challenge.lastSyncedAt,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};
