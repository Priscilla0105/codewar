// backend/services/matchmakingService.js

const matchQueues = {
  Easy: [],
  Medium: [],
  Hard: []
};

const activeMatches = new Map();

class MatchmakingService {
  addToQueue(userId, username, difficulty, socketId) {
    matchQueues[difficulty].push({
      userId,
      username,
      socketId,
      joinedAt: Date.now()
    });

    // Check if 2 players ready
    if (matchQueues[difficulty].length >= 2) {
      return this.createMatch(difficulty);
    }
    return null;
  }

  createMatch(difficulty) {
    const player1 = matchQueues[difficulty].shift();
    const player2 = matchQueues[difficulty].shift();

    const matchId = `match_${Date.now()}`;
    const matchData = {
      id: matchId,
      player1,
      player2,
      difficulty,
      startTime: Date.now()
    };

    activeMatches.set(matchId, matchData);
    return matchData;
  }

  removeFromQueue(socketId, difficulty) {
    matchQueues[difficulty] = matchQueues[difficulty]
      .filter(p => p.socketId !== socketId);
  }

  getActiveMatch(matchId) {
    return activeMatches.get(matchId);
  }
}

module.exports = new MatchmakingService();