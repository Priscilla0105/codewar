// backend/controllers/matchController.js
const Match = require('../models/Match');
const User = require('../models/User'); // உங்க User model

exports.getMatchHistory = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [
        { player1Id: req.params.userId },
        { player2Id: req.params.userId }
      ]
    }).sort({ date: -1 }).limit(20);

    res.json({ matches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.find({})
      .sort({ 'stats.rating': -1 })
      .limit(50);

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};