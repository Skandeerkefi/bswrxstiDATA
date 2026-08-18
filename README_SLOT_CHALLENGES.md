# Slot Challenge System Documentation

## Overview

The Slot Challenge system allows administrators to create challenges where players compete to achieve the highest multiplier on a specific slot game. The system syncs player data from the Roobet Affiliate API and maintains a live leaderboard.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend       │────▶│   Backend API    │────▶│   Roobet API    │
│   (React/Vite)   │     │   (Express.js)   │     │   (Affiliate)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │                        ▼
        │                ┌──────────────────┐
        │                │   MongoDB        │
        │                │   (SlotChallenge) │
        └────────────────└──────────────────┘
```

## Data Flow

### 1. Challenge Creation (Admin)
1. Admin searches for slots using `/api/slot-challenges/slots/search?q=<query>`
2. Admin creates challenge via `POST /api/slot-challenges/` with game details
3. Challenge is stored in MongoDB with status "upcoming" or "active"

### 2. Leaderboard Sync (Admin Triggered)
1. Admin clicks "Refresh Leaderboard" button
2. Request: `POST /api/slot-challenges/:id/refresh`
3. Backend fetches data from Roobet Affiliate API
4. Data is filtered, processed, and saved to MongoDB
5. Frontend displays updated leaderboard

### 3. Public Access
- Anyone can view challenge details: `GET /api/slot-challenges/:id`
- Anyone can view leaderboard: `GET /api/slot-challenges/:id/leaderboard`

---

## API Endpoints

### Public Routes

#### GET /api/slot-challenges/
Get all challenges.

**Response:**
```json
[
  {
    "_id": "6a7d2038fa12ca2dcd9fc6d8",
    "title": "Slot Challenge - Densho",
    "gameTitle": "Densho",
    "gameProvider": "Hacksaw Gaming",
    "minBet": 0.2,
    "targetMultiplier": 1000,
    "winnerCount": 1,
    "status": "active",
    "startDate": "2026-08-14T18:40:00.000Z",
    "endDate": "2026-09-30T12:38:00.000Z",
    "leaderboard": [...]
  }
]
```

#### GET /api/slot-challenges/:id
Get a single challenge by ID.

**Response:**
```json
{
  "_id": "6a7d2038fa12ca2dcd9fc6d8",
  "title": "Slot Challenge - Densho",
  "gameId": "hacksaw:1348",
  "gameTitle": "Densho",
  "gameImageUrl": "https://...",
  "gameProvider": "Hacksaw Gaming",
  "minBet": 0.2,
  "targetMultiplier": 1000,
  "winnerCount": 1,
  "status": "active",
  "startDate": "2026-08-14T18:40:00.000Z",
  "endDate": "2026-09-30T12:38:00.000Z",
  "lastSyncedAt": "2026-08-18T02:59:37.195Z",
  "leaderboard": [
    {
      "uid": "bd3717f7-863a-41c4-8911-b2e5b8df7559",
      "username": "g**********y",
      "wagered": 130.80,
      "weightedWagered": 130.80,
      "favoriteGameId": "hacksaw:1348",
      "favoriteGameTitle": "Densho",
      "rankLevel": 11,
      "rankLevelImage": "https://...",
      "highestMultiplier": {
        "multiplier": 101.47,
        "wagered": 1.2,
        "payout": 121.76,
        "gameId": "hacksaw:1348",
        "gameTitle": "Densho"
      },
      "isWinner": false,
      "winnerRank": null,
      "qualifiedAt": null
    }
  ]
}
```

#### GET /api/slot-challenges/:id/leaderboard
Get leaderboard for a specific challenge (sorted by multiplier).

**Response:**
```json
{
  "challenge": {
    "_id": "6a7d2038fa12ca2dcd9fc6d8",
    "title": "Slot Challenge - Densho",
    "gameTitle": "Densho",
    "gameImageUrl": "https://...",
    "minBet": 0.2,
    "targetMultiplier": 1000,
    "winnerCount": 1,
    "status": "active",
    "startDate": "2026-08-14T18:40:00.000Z",
    "endDate": "2026-09-30T12:38:00.000Z"
  },
  "leaderboard": [
    {
      "rank": 1,
      "uid": "...",
      "username": "g**********y",
      "highestMultiplier": { "multiplier": 101.47, ... },
      "isWinner": false,
      ...
    }
  ],
  "lastSyncedAt": "2026-08-18T02:59:37.195Z"
}
```

#### GET /api/slot-challenges/slots/search?q=<query>
Search for slot games (used by admin).

**Query Parameters:**
- `q` (required): Search query string

**Response:**
```json
[
  {
    "name": "Densho",
    "image": "https://...",
    "url": "https://roobet.com/play/...",
    "provider": "Hacksaw Gaming"
  }
]
```

### Admin Routes (Protected)

#### POST /api/slot-challenges/
Create a new challenge.

**Request Body:**
```json
{
  "title": "Slot Challenge - Densho",
  "gameTitle": "Densho",
  "gameImageUrl": "https://...",
  "gameProvider": "Hacksaw Gaming",
  "minBet": 0.2,
  "targetMultiplier": 1000,
  "winnerCount": 1,
  "winnerSelectionMode": "firstComeFirstServed",
  "startDate": "2026-08-14T18:40:00.000Z",
  "endDate": "2026-09-30T12:38:00.000Z"
}
```

**Response:** Created challenge object

#### PUT /api/slot-challenges/:id
Update a challenge.

**Request Body:** Partial challenge object with fields to update

#### DELETE /api/slot-challenges/:id
Delete a challenge.

#### POST /api/slot-challenges/:id/refresh
Refresh the leaderboard from Roobet API.

**Response:**
```json
{
  "message": "Leaderboard refreshed successfully",
  "stats": {
    "usersProcessed": 100,
    "leaderboardEntries": 50,
    "winnersCount": 1,
    "gameIdResolved": true
  },
  "challenge": { ... }
}
```

---

## Data Models

### SlotChallenge Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| title | String | Yes | "Slot Challenge" | Challenge title |
| gameId | String | No | null | Roobet game identifier (e.g., "hacksaw:1348") |
| gameTitle | String | Yes | - | Name of the slot game |
| gameImageUrl | String | No | "" | URL to game thumbnail |
| gameProvider | String | No | "" | Game provider (e.g., "Hacksaw Gaming") |
| minBet | Number | Yes | 0.2 | Minimum bet to qualify |
| targetMultiplier | Number | Yes | 1000 | Target multiplier to win |
| winnerCount | Number | Yes | 3 | Number of winners |
| winnerSelectionMode | String | No | "firstComeFirstServed" | How winners are selected |
| isActive | Boolean | No | true | Whether challenge is active |
| status | String | No | "active" | Status: "active", "upcoming", "ended" |
| startDate | Date | No | Date.now | When challenge starts |
| endDate | Date | No | null | When challenge ends |
| lastSyncedAt | Date | No | null | Last API sync time |
| nextSyncAt | Date | No | null | Next scheduled sync |
| leaderboard | Array | No | [] | Array of ChallengeResult |

### ChallengeResult Schema (Embedded in leaderboard)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| uid | String | - | Player's unique ID |
| username | String | - | Player's username (blurred) |
| wagered | Number | 0 | Total wagered on game |
| weightedWagered | Number | 0 | Weighted wager amount |
| favoriteGameId | String | "" | Player's favorite game |
| favoriteGameTitle | String | "" | Player's favorite game name |
| rankLevel | Number | 0 | Player's VIP level |
| rankLevelImage | String | "" | URL to level badge |
| highestMultiplier | Object | - | Best multiplier achievement |
| highestMultiplier.multiplier | Number | 0 | The multiplier value |
| highestMultiplier.wagered | Number | 0 | Bet size for that multiplier |
| highestMultiplier.payout | Number | 0 | Payout amount |
| highestMultiplier.gameId | String | "" | Game ID |
| highestMultiplier.gameTitle | String | "" | Game title |
| isWinner | Boolean | false | Whether player won |
| winnerRank | Number | null | Winner's rank (1, 2, 3...) |
| qualifiedAt | Date | null | When player qualified |
| updatedAt | Date | Date.now | Last update time |

---

## Roobet API Integration

### API Endpoint
```
GET https://api.roobet.com/affiliate/v2/stats
```

### Required Environment Variables
```
USER_ID=<your-affiliate-user-id>
ROOBET_API_KEY=<your-api-key>
API_BASE_URL=https://api.roobet.com
```

### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | String | Affiliate user ID |
| startDate | String (ISO) | Start of date range |
| endDate | String (ISO) | End of date range |
| categories | String | Filter by category: "slots,provably fair" |
| gameIdentifiers | String | Specific game ID to filter |

### Request Headers
```
Authorization: Bearer <ROOBET_API_KEY>
```

### Data Processing
1. **Filter Dice Games**: Excludes "housegames:dice" from results
2. **Filter Valid Multipliers**: Only includes players with `highestMultiplier.multiplier > 0`
3. **Game Matching**: Matches `highestMultiplier.gameTitle` against challenge's `gameTitle`
4. **Qualification Check**: Player qualifies if `highestMultiplier.wagered >= minBet`
5. **Winner Assignment**: Based on `winnerSelectionMode`:
   - `firstComeFirstServed`: First players to hit target multiplier
   - `topPerformers`: Players with highest multipliers

### Username Blurring
For privacy, usernames are blurred:
- Input: "example123"
- Output: "e********3"
- Rules: First and last character visible, middle characters replaced with `*`

---

## Winner Selection Modes

### firstComeFirstServed
- Players are checked in order of their multiplier achievement time
- First `winnerCount` players to hit `targetMultiplier` with `wagered >= minBet` win
- Useful for time-limited challenges

### topPerformers
- All qualifying players are ranked by their multiplier
- Top `winnerCount` players win
- Winners are reassigned after each sync based on rankings
- Useful for open-ended challenges

---

## Automatic Sync

The system can automatically sync active challenges using:
```javascript
// Call this periodically (e.g., every hour)
const results = await syncAllActiveChallenges();
```

Sync is performed if:
- Challenge `isActive` is true
- Challenge `status` is "active"
- Current time >= `nextSyncAt` (defaults to 5 hours after last sync)

---

## Frontend Components

### Pages
- `/slot-challenges` - List all challenges
- `/slot-challenges/:id` - Challenge details with leaderboard
- `/admin/slot-challenges` - Admin management page

### Store (Zustand)
```typescript
interface SlotChallengeStore {
  challenges: SlotChallenge[];
  currentChallenge: SlotChallenge | null;
  isLoading: boolean;
  fetchChallenge: (id: string) => Promise<void>;
  refreshLeaderboard: (id: string) => Promise<void>;
}
```

### Display Features
- Challenge header with game image and stats
- Live leaderboard sorted by multiplier
- Winner badges with crown/medal icons
- Player level badges
- Multiplier, bet size, and payout display
- Qualification status indicators

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request | Invalid API parameters | Check environment variables |
| 401 Unauthorized | Invalid/missing API key | Verify ROOBET_API_KEY |
| 404 Not Found | Challenge not found | Verify challenge ID |
| 500 Internal Server Error | API or database error | Check server logs |

---

## Environment Variables

Required in `MisterTeeDATA/.env`:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/mistertee

# Roobet API (Affiliate)
USER_ID=your_affiliate_user_id
ROOBET_API_KEY=your_api_key
API_BASE_URL=https://api.roobet.com

# Server
PORT=3000
JWT_SECRET=your_jwt_secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

---

## Troubleshooting

### "Failed to sync with Roobet API" (400 Error)
- **Cause**: Incorrect USER_ID or ROOBET_API_KEY
- **Fix**: Verify environment variables match your Roobet Affiliate dashboard

### "Failed to sync with Roobet API" (401 Error)
- **Cause**: Invalid API key
- **Fix**: Regenerate your API key in Roobet Affiliate dashboard

### Empty Leaderboard After Refresh
- **Cause**: Game title mismatch between challenge and Roobet data
- **Fix**: Check that `gameTitle` matches exactly with Roobet's game name
- **Debug**: Check server logs for "Filtered: user X played Y, looking for Z"

### Players Not Appearing
- **Cause**: `highestMultiplier.multiplier <= 0` after filtering
- **Fix**: Ensure players have placed bets on the specified game during the challenge period

### Winner Status Not Assigned
- **Cause**: No players hit the `targetMultiplier` with bets >= `minBet`
- **Fix**: Check that `minBet` is set correctly and players have wagered enough

---

## Example API Calls

### Create a Challenge (Admin)
```bash
curl -X POST http://localhost:3000/api/slot-challenges/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "title": "Slot Challenge - Densho",
    "gameTitle": "Densho",
    "gameImageUrl": "https://roobet.com/game-image.jpg",
    "gameProvider": "Hacksaw Gaming",
    "minBet": 0.2,
    "targetMultiplier": 1000,
    "winnerCount": 1,
    "startDate": "2026-08-14T18:40:00.000Z",
    "endDate": "2026-09-30T12:38:00.000Z"
  }'
```

### Refresh Leaderboard (Admin)
```bash
curl -X POST http://localhost:3000/api/slot-challenges/<challenge_id>/refresh \
  -H "Authorization: Bearer <admin_token>"
```

### Get Challenge Details (Public)
```bash
curl http://localhost:3000/api/slot-challenges/<challenge_id>
```

### Search Slots (Admin)
```bash
curl "http://localhost:3000/api/slot-challenges/slots/search?q=Densho"
```

---

## Related Files

| File | Description |
|------|-------------|
| `controllers/slotChallengeController.js` | Main controller with all API logic |
| `routes/slotChallengeRoutes.js` | Express routes |
| `models/SlotChallenge.js` | MongoDB schema |
| `src/store/useSlotChallengeStore.ts` | Zustand store |
| `src/pages/SlotChallengeDetailPage.tsx` | Challenge detail page |
| `src/pages/SlotChallengesPage.tsx` | Challenges list page |
| `src/components/AdminChallengeForm.tsx` | Create/edit challenge form |

