// routes/customRooms.ts
import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middlewares/authMiddleware";
import CustomRoom from "../models/CustomRoom.js";
import * as MatchModule from "../models/Match.js";

// Handle both default and named exports from Match model
const Match = (MatchModule as any).default ?? MatchModule;

// Extend Express Request to include user from auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}

// Typed interface for CustomRoom document access
interface CustomRoomDoc {
  get(path: string): any;
  set(path: string, value: any): void;
  save(): Promise<any>;
  toObject(): any;
  _id: any;
}

const router = express.Router();

// Store active rooms in memory (or MongoDB for persistence)
const activeRooms = new Map<string, any>();

// Helper: safely extract a string from req.body (guards against string[])
function bodyString(val: unknown): string {
  return Array.isArray(val) ? val[0] : String(val ?? "");
}

/**
 * POST /api/custom-rooms/create
 * Create a new custom room
 */
router.post("/create", requireAuth, async (req: Request, res: Response) => {
  try {
    const { difficulty, hostId, hostName, hostAvatar } = req.body;

    if (!difficulty || !hostId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const roomCode = `CUSTOM_${uuidv4().substring(0, 6).toUpperCase()}`;

    const room = {
      roomCode,
      difficulty,
      hostId,
      hostName,
      hostAvatar,
      opponentId: null as string | null,
      opponentName: null as string | null,
      opponentAvatar: null as string | null,
      status: "waiting" as const,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };

    const customRoom = new CustomRoom(room);
    await customRoom.save();

    activeRooms.set(roomCode, room);

    console.log(`✅ Custom room created: ${roomCode}`);

    res.json({ roomCode, room });
  } catch (error) {
    console.error("Error creating custom room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

/**
 * POST /api/custom-rooms/join
 * Join an existing custom room
 */
router.post("/join", requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomCode, opponentId, opponentName, opponentAvatar } = req.body;

    if (!roomCode || !opponentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const roomCodeStr = bodyString(roomCode).toUpperCase();

    const customRoom = await CustomRoom.findOne({ roomCode: roomCodeStr }) as unknown as CustomRoomDoc | null;

    if (!customRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (customRoom.get("status") !== "waiting") {
      return res.status(400).json({ error: "Room is not accepting players" });
    }

    if (customRoom.get("opponentId")) {
      return res.status(400).json({ error: "This room already has 2 players" });
    }

    customRoom.set("opponentId", opponentId);
    customRoom.set("opponentName", opponentName);
    customRoom.set("opponentAvatar", opponentAvatar);
    customRoom.set("status", "ready");
    await customRoom.save();

    activeRooms.set(roomCodeStr, customRoom.toObject());

    const match = new Match({
      matchId: uuidv4(),
      type: "custom",
      difficulty: customRoom.get("difficulty"),
      player1: {
        userId: customRoom.get("hostId"),
        username: customRoom.get("hostName"),
      },
      player2: {
        userId: opponentId,
        username: opponentName,
      },
      roomCode: roomCodeStr,
      status: "waiting",
      createdAt: new Date(),
    });

    await match.save();

    console.log(`✅ Player joined room: ${roomCodeStr}`);

    res.json({ room: customRoom, matchId: match.matchId });
  } catch (error) {
    console.error("Error joining custom room:", error);
    res.status(500).json({ error: "Failed to join room" });
  }
});

/**
 * GET /api/custom-rooms/status/:roomCode
 * Get current room status
 */
router.get("/status/:roomCode", requireAuth, async (req: Request, res: Response) => {
  try {
    const roomCode = String(req.params.roomCode).toUpperCase();

    const customRoom = await CustomRoom.findOne({ roomCode });

    if (!customRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({ room: customRoom });
  } catch (error) {
    console.error("Error fetching room status:", error);
    res.status(500).json({ error: "Failed to fetch room status" });
  }
});

/**
 * POST /api/custom-rooms/start
 * Start the game
 */
router.post("/start", requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({ error: "Room code required" });
    }

    const roomCodeStr = bodyString(roomCode).toUpperCase();

    const customRoom = await CustomRoom.findOne({ roomCode: roomCodeStr }) as unknown as CustomRoomDoc | null;

    if (!customRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!customRoom.get("opponentId")) {
      return res.status(400).json({ error: "Waiting for opponent" });
    }

    customRoom.set("status", "active");
    customRoom.set("startedAt", new Date());
    await customRoom.save();

    await Match.findOneAndUpdate(
      { roomCode: roomCodeStr },
      { status: "active", startedAt: new Date() }
    );

    console.log(`🎮 Game started in room: ${roomCodeStr}`);

    res.json({
      matchId: customRoom._id,
      message: "Game started successfully",
    });
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: "Failed to start game" });
  }
});

/**
 * POST /api/custom-rooms/leave
 * Leave/cancel custom room
 */
router.post("/leave", requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({ error: "Room code required" });
    }

    const roomCodeStr = bodyString(roomCode).toUpperCase();

    await CustomRoom.deleteOne({ roomCode: roomCodeStr });
    activeRooms.delete(roomCodeStr);

    await Match.findOneAndUpdate({ roomCode: roomCodeStr }, { status: "cancelled" });

    console.log(`❌ Player left room: ${roomCodeStr}`);

    res.json({ message: "Left room successfully" });
  } catch (error) {
    console.error("Error leaving room:", error);
    res.status(500).json({ error: "Failed to leave room" });
  }
});

/**
 * POST /api/custom-rooms/submit
 * Submit solution in custom room match
 */
router.post("/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const { roomCode, code, language, problemId, executionTime } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const roomCodeStr = bodyString(roomCode).toUpperCase();

    const customRoom = await CustomRoom.findOne({ roomCode: roomCodeStr }) as unknown as CustomRoomDoc | null;

    if (!customRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    const match = await Match.findOne({ roomCode: roomCodeStr });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const isPlayer1 = userId === customRoom.get("hostId");
    const playerKey = isPlayer1 ? "player1Result" : "player2Result";

    match.set(playerKey, {
      userId,
      code,
      language,
      problemId,
      executionTime,
      submittedAt: new Date(),
      status: "completed",
    });

    const p1Result = match.get("player1Result");
    const p2Result = match.get("player2Result");

    if (p1Result && p2Result) {
      const player1Time: number = p1Result.executionTime ?? Infinity;
      const player2Time: number = p2Result.executionTime ?? Infinity;

      if (player1Time < player2Time) {
        match.set("winner", match.get("player1")?.userId);
      } else if (player2Time < player1Time) {
        match.set("winner", match.get("player2")?.userId);
      } else {
        match.set("winner", "tie");
      }

      match.set("status", "completed");
      match.set("completedAt", new Date());

      customRoom.set("status", "completed");
      await customRoom.save();
    }

    await match.save();

    res.json({ success: true, match });
  } catch (error) {
    console.error("Error submitting solution:", error);
    res.status(500).json({ error: "Failed to submit solution" });
  }
});

/**
 * GET /api/custom-rooms/active
 * Get all active rooms (for debugging/admin)
 */
router.get("/active", requireAuth, async (req: Request, res: Response) => {
  try {
    // Cast to any to bypass Mongoose's strict $in union typing
    const rooms = await (CustomRoom as any).find({
      status: { $in: ["waiting", "ready", "active"] },
    });

    res.json({ rooms, totalActive: rooms.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active rooms" });
  }
});

export default router;