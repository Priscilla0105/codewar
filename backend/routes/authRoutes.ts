// Custom express route handlers matching structural definitions
import { Router } from "express";
import { getLeaderboard, getOnlineUsers } from "../controllers/userController";

const router = Router();

// Leaderboard list
router.get('${API_URL}/leaderboard', getLeaderboard);

// Online users
router.get("/online-users", getOnlineUsers);

export default router;
