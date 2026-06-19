// backend/routes/matchRoutes.js
const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/history/:userId', matchController.getMatchHistory);
router.get(`${API_URL}/leaderboard`, matchController.getLeaderboard);

module.exports = router;