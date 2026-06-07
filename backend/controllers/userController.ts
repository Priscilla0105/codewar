// Production-grade backend controller for user operations
import { Request, Response } from "express";
import { DBService } from "../services/dbService";

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const list = await DBService.getUsers();
    const ranked = [...list]
      .filter(u => !u.isBanned)
      .sort((a, b) => b.stats.rating - a.stats.rating);
    return res.json({ leaderboard: ranked });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Leaderboard retrieval failed." });
  }
};

export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const list = await DBService.getUsers();
    // Filter active online candidates
    const online = list.filter(u => u.online && !u.isBanned);
    return res.json({ onlineUsers: online });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to list active users." });
  }
};
