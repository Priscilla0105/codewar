import express from "express";
import http from "http";
import path from "path";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import bcrypt from "bcryptjs";
import cors from "cors";
import { db } from "./server/db";
import { generateAiOpponentChat, generateAiMentorChat, getAiClient } from "./server/gemini";
import { compileAndExecuteCode } from "./server/compiler";
import { problems } from "./src/data/problems";
import { User, ChatMessage, CheatingLog, CodeSubmission, Problem } from "./src/types";

dotenv.config();

console.log(`[SYS] Environment variables initialized. Admin Portal endpoint secure.`);

const JWT_SECRET = process.env.JWT_SECRET || "clash-secret-key-1010";
const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  // Initialize dynamic database caches in the background (non-blocking)
  db.initialize().catch(err => {
    console.error("Non-blocking DB initialization threw an error:", err);
  });

  const app = express();
  const server = http.createServer(app);
  
  app.use(cors({
  origin: [
    "https://codewar-gold.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use(cors({
  origin: ["https://codewar-gold.vercel.app"],
  credentials: true
}));

app.use(express.json());
  
  // Initialize Socket.IO with CORS
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());
   
  // UTILITY MIDDLEWARE: Check JWT Authenticated User
  
  const authenticateUser = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    console.log("AUTH HEADER:", authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    const token = authHeader.split(" ")[1];

    console.log("TOKEN:", token);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
       console.log("DECODED:", decoded);
      const user = db.findUserById(decoded.id);
      console.log("USER:", user);
      if (!user) {
        return res.status(401).json({ error: "User session not found" });
      }
      if (user.isBanned) {
        return res.status(403).json({ error: "Your account is currently banned" });
      }
      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Session expired, please sign in again" });
    }
  };

  // UTILITY MIDDLEWARE: Admin Guard
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin permissions required." });
    }
    next();
  };

  // ==================== AUTHENTICATION API ROUTES ====================

  // Register Email
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All account fields are required" });
    }
    try {
      const newUser = db.registerUser(username, email, password);
      const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: "7d" });
      
      db.addLoginHistory(newUser.id, {
        date: new Date().toISOString(),
        ipAddress: req.ip || "127.0.0.1",
        device: req.headers["user-agent"] || "Generic Web Device",
        location: "System Portal Initial Registration"
      });

      return res.json({ token, user: newUser });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Failed to register account" });
    }
  });

  // Login Email
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    try {
      const authenticatedUser = db.authenticate(email, password);
      if (!authenticatedUser) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ id: authenticatedUser.id, email: authenticatedUser.email }, JWT_SECRET, { expiresIn: "7d" });
      
      db.addLoginHistory(authenticatedUser.id, {
        date: new Date().toISOString(),
        ipAddress: req.ip || "127.0.0.1",
        device: req.headers["user-agent"] || "Generic Web Device",
        location: "System Portal Authentication"
      });

      return res.json({ token, user: authenticatedUser });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Authentication failed" });
    }
  });

  // Auto Session Restore
  app.get("/api/auth/me", authenticateUser, (req: any, res) => {
    return res.json({ user: req.user });
  });

  // Login History
  app.get("/api/auth/history", authenticateUser, (req: any, res) => {
    const history = db.getLoginHistory(req.user.id);
    return res.json({ history });
  });

  // Firebase Google Auth Sign-in Proxy Bridge
  app.post("/api/auth/google-sign-in", (req, res) => {
    const { email, name, googleUid } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Google payload is missing email metadata" });
    }

    let user = db.findUserByEmail(email);
    if (!user) {
      // Automatic auto-registration for streamlined Google sign-ins
      const friendlyUsername = (name || email.split("@")[0]).replace(/\s+/g, "_") + "_" + Math.floor(Math.random() * 100);
      user = db.registerUser(friendlyUsername, email, googleUid || "google-oauth-pwd-" + Math.random().toString());
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been banned due to anti-cheat violation" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    
    db.addLoginHistory(user.id, {
      date: new Date().toISOString(),
      ipAddress: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "Google Verified Authentication",
      location: "Verified Google Auth SSO"
    });

    return res.json({ token, user });
  });

  // Password Forget & Reset OTP Mock flow with Console log transparency
  const tempOtpStore: { [email: string]: { otp: string; expires: number } } = {};

  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "No account matched with this email address" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    tempOtpStore[email.toLowerCase()] = {
      otp,
      expires: Date.now() + 1000 * 60 * 10 // 10 minutes limit
    };

    console.log("=================================================");
    console.log(`🔒 PASSWORDS SECURITY DISPATCHER OTP FOR:${email}`);
    console.log(`🔐 TOKEN OTP: [ ${otp} ]`);
    console.log("=================================================");

    return res.json({
      success: true,
      message: `OTP dispatched successfully to ${email}.`,
      otpDemo: otp // Returned in dev payload for quick UI accessibility
    });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP secret are required" });
    }
    const record = tempOtpStore[email.toLowerCase()];
    if (!record) {
      return res.status(400).json({ error: "No OTP requests registered for this email address" });
    }

    if (Date.now() > record.expires) {
      delete tempOtpStore[email.toLowerCase()];
      return res.status(400).json({ error: "Verification token expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: "Incorrect verification OTP. Verify console logs." });
    }

    return res.json({ success: true, message: "Token verified. Reset password is now enabled." });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "All parameters are required" });
    }
    const record = tempOtpStore[email.toLowerCase()];
    if (!record || record.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP token" });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Force register/overwrite passwords
    const PASSWORDS_FILE = path.join(process.cwd(), "local_passwords.json");
    const hashes = JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf-8"));
    hashes[email.toLowerCase()] = bcrypt.hashSync(newPassword, 10);
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(hashes, null, 2));

    delete tempOtpStore[email.toLowerCase()];
    return res.json({ success: true, message: "Password updated successfully. Return to Sign In." });
  });

  // ==================== CODING PROBLEMS & SUBMISSIONS ROUTES ====================

  // Get Problem details
  app.get("/api/problems", (req, res) => {
    return res.json({ problems });
  });

  app.get("/api/problems/:id", (req, res) => {
    const problem = problems.find(p => p.id === req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    return res.json({ problem });
  });

  // Run Code Test Endpoint
  app.post("/api/compiler/run", authenticateUser, async (req, res) => {
    const { problemId, language, code, customInput } = req.body;
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return res.status(404).json({ error: "Problem definition matches none" });

    try {
      // Use custom inputs if active, or use the visible test cases
      const testCases = customInput
        ? [{ input: customInput, expectedOutput: "" }]
        : problem.visibleTestCases;

      const result = await compileAndExecuteCode(language, code, testCases);
      return res.json({ result });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Compilation failed unexpectedly" });
    }
  });

  // Official Sandbox Code Submissions
  app.post("/api/compiler/submit", authenticateUser, async (req: any, res) => {
    const { problemId, language, code, wpm, accuracy } = req.body;
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    try {
      // Combine visible and hidden cases
      const allTestCases = [...problem.visibleTestCases, ...problem.hiddenTestCases];
      const result = await compileAndExecuteCode(language, code, allTestCases);

      const submission: CodeSubmission = {
        id: "s_" + Math.random().toString(36).substr(2, 9),
        userId: req.user.id,
        username: req.user.username,
        problemId: problem.id,
        problemTitle: problem.title,
        language: language,
        code: code,
        status: result.status,
        executionTimeMs: result.executionTimeMs,
        memoryUsageKb: result.memoryUsageKb,
        submittedAt: new Date().toISOString(),
        failedTestCaseIndex: result.failedTestCaseIndex,
        actualOutput: result.actualOutput,
        expectedOutput: result.expectedOutput
      };

      db.submitCode(submission);

      // Save user metrics update if passed!
      if (result.status === "Accepted") {
        db.updateStatsAndRating(req.user.id, "win", 1100, problem.difficulty, wpm, accuracy);
      } else {
        // Log minor submission update inside streak check
        db.updateActivityStreak(req.user.id);
      }

      return res.json({ result, submission });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed processing submission" });
    }
  });

  // Get Submission histories
  app.get("/api/submissions", authenticateUser, (req: any, res) => {
    const list = db.getSubmissions(req.user.id);
    return res.json({ submissions: list });
  });

  // ==================== DASHBOARD & STATS API ROUTES ====================

  // ✅ LEADERBOARD - SANJAI.LX REMOVED (FILTER BY USERNAME & ADMIN ROLE)
  app.get("/api/dashboard/leaderboard", (req, res) => {
    try {
      const users = db.getUsers() || [];
      const ranked = [...users]
        .filter(u => u && !u.isBanned && u.role !== "admin" && u.username !== "Sanjai.lx")
        .sort((a, b) => {
          const ratingA = a?.stats?.rating !== undefined ? a.stats.rating : 1000;
          const ratingB = b?.stats?.rating !== undefined ? b.stats.rating : 1000;
          return ratingB - ratingA;
        });
      return res.json({ leaderboard: ranked });
    } catch (e: any) {
      console.error("Error loading leaderboard:", e);
      return res.status(500).json({ error: "Failed to load leaderboard database." });
    }
  });

  // User Stats details + matches histories
  app.get("/api/dashboard/stats/:userId", (req, res) => {
    try {
      const user = db.findUserById(req.params.userId);
      if (!user) return res.status(404).json({ error: "User profile maps to none" });
      
      const matches = db.getMatchHistory(user.id) || [];
      const submissions = db.getSubmissions(user.id) || [];
      
      return res.json({
        user,
        matches,
        submissions
      });
    } catch (e: any) {
      console.error(`Error loading stats for ${req.params.userId}:`, e);
      return res.status(500).json({ error: "Failed to load user stats." });
    }
  });

  // Get active online real users list
  app.get("/api/dashboard/online-users", authenticateUser, (req: any, res) => {
    try {
      const list = (db.getUsers() || [])
        .filter(u => u && u.online && !u.isBanned && u.id !== req.user.id);
      return res.json({ onlineUsers: list });
    } catch (e: any) {
      console.error("Error loading online users:", e);
      return res.status(500).json({ error: "Failed to load online users." });
    }
  });

  // Update real profile data (username, display name, bio, etc.)
  app.post("/api/dashboard/profile", authenticateUser, (req: any, res) => {
    const { name, bio, username, avatar } = req.body;
    const user = db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "Authenticated user not found in DB." });

    if (username && username.trim()) {
      // Check if username unique
      const norm = username.trim();
      const existing = db.getUsers().find(u => u.username.toLowerCase() === norm.toLowerCase() && u.id !== user.id);
      if (existing) {
        return res.status(400).json({ error: "Username is already registered." });
      }
      user.username = norm;
    }
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) (user as any).avatar = avatar;

    // Persist
    db.save();
    return res.json({ success: true, user });
  });

  // Request intelligent practice / study guidance hint
  app.post("/api/practice/hint", authenticateUser, async (req: any, res) => {
    const { problemTitle, problemDescription, code, language } = req.body;
    if (!problemTitle) {
      return res.status(400).json({ error: "Metadata required for challenge guidance." });
    }

    try {
      const ai = getAiClient();
      if (!ai) {
        return res.json({ hint: "Focus on boundary cases like empty strings or single-element inputs! Try stepping through your nested conditions step-by-step." });
      }

      const prompt = `You are a warm, encouraging, expert programming coach in "Clash of Coders".
A beginner student is requesting a study tip for the problem "${problemTitle}".
Here is the core logic goal:
"${problemDescription || 'Write optimized logic matching name'}"

Student's current source implementation in ${language || 'javascript'}:
\`\`\`
${code || '// No logic created yet'}
\`\`\`

Provide a short, extremely helpful, encouraging tip that points out any bugs or recommends the right architectural step.
Keep it under 3 sentences. Do NOT provide the code solution or direct copy-paste code. Be helpful and warm.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.75
        }
      });

      return res.json({ hint: response.text?.trim() || "Analyze boundary constraints and explore intermediate states!" });
    } catch (e: any) {
      console.error("Gemini coach generator error:", e);
      return res.json({ hint: "Double-check your array iteration intervals and review edge-case inputs!" });
    }
  });

  // ==================== GENERAL CHAT AND TELEMETRY HISTORY ====================
  app.get("/api/chats/:lobbyId", authenticateUser, (req, res) => {
    const logs = db.getChatHistory(req.params.lobbyId);
    return res.json({ chats: logs });
  });

  // ==================== ADMINISTRATIVE CONTROLLER PORTAL ====================

  app.get("/api/admin/users", authenticateUser, requireAdmin, (req, res) => {
    const list = db.getUsers();
    return res.json({ users: list });
  });

  app.post("/api/admin/users/ban", authenticateUser, requireAdmin, (req, res) => {
    const { userId, isBanned } = req.body;
    const success = db.setBanStatus(userId, isBanned);
    return res.json({ success });
  });

  app.get("/api/admin/cheating-logs", authenticateUser, requireAdmin, (req, res) => {
    const logs = db.getCheatingLogs();
    return res.json({ cheatingLogs: logs });
  });

  app.post("/api/admin/reset-leaderboard", authenticateUser, requireAdmin, (req, res) => {
    const success = db.resetLeaderboard();
    return res.json({ success, message: "Ratings updated and reset successfully." });
  });

  // Secure Administrative Analytics & Database Statistics
  app.get('${API_URL/api/admin/analytics', authenticateUser, requireAdmin, (req, res) => {
    try {
      const users = db.getUsers() || [];
      const cheatingLogs = db.getCheatingLogs() || [];
      const submissions = db.getSubmissions(undefined) || [];
      const activeRoomsCount = Object.keys(activeRooms).length;

      return res.json({
        totalUsers: users.length,
        onlineUsersCount: users.filter(u => u.online).length,
        totalProblems: problems.length,
        totalSubmissions: submissions.length,
        totalCheatingLogs: cheatingLogs.length,
        activeRoomsCount: activeRoomsCount,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        dbStatus: "Ready (MongoDB Atlas Connected)"
      });
    } catch (e: any) {
      console.error("Admin analytics error:", e);
      return res.status(500).json({ error: "Failed to generate analytics metrics" });
    }
  });

  // Secure Administrative Active Battles Monitoring
  app.get('${API_URL/api/admin/active-battles', authenticateUser, requireAdmin, (req, res) => {
    try {
      const list = Object.values(activeRooms).map(r => ({
        id: r.id,
        difficulty: r.difficulty,
        problemTitle: r.problem.title,
        timer: r.timer,
        isStarted: r.isStarted,
        isFinished: r.isFinished,
        isAiGame: r.isAiGame,
        isPractice: !!(r as any).isPractice,
        players: Object.values(r.players).map(p => ({
          id: p.id,
          username: p.username,
          progress: p.progress,
          wpm: p.wpm,
          warnings: p.warnings
        }))
      }));
      return res.json({ battles: list });
    } catch (e: any) {
      console.error("Admin active battles monitoring failed:", e);
      return res.status(500).json({ error: e.message || "Failed to query battle state indices" });
    }
  });

  // Secure Administrative Problem Deletion API
  app.delete("/api/admin/problems/:id", authenticateUser, requireAdmin, (req, res) => {
    try {
      const id = req.params.id;
      const index = problems.findIndex(p => p.id === id);
      if (index >= 0) {
        problems.splice(index, 1);
        return res.json({ success: true, message: "Problem deleted from server active challenges list." });
      }
      return res.status(404).json({ error: "Challenge matching requested index path not found." });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed deleting problem" });
    }
  });

  // Secure Admin Password Management API
  app.post("/api/admin/change-password", authenticateUser, requireAdmin, (req: any, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "All password fields are required." });
      }

      // 1. New password and confirm password must match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
      }

      // 2. Minimum 8 characters. Must contain uppercase, lowercase, number, and special character.
      const isStrong = (pwd: string) => {
        if (pwd.length < 8) return false;
        if (!/[A-Z]/.test(pwd)) return false;
        if (!/[a-z]/.test(pwd)) return false;
        if (!/\d/.test(pwd)) return false;
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return false;
        return true;
      };

      if (!isStrong(newPassword)) {
        return res.status(400).json({ error: "Weak password detected." });
      }

      // 3. Attempt to update admin password
      db.updateAdminPassword(req.user.email, currentPassword, newPassword);
      return res.json({ success: true, message: "Admin password updated successfully." });
    } catch (e: any) {
      if (e.message && e.message.includes("Incorrect current password")) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
      return res.status(500).json({ error: e.message || "Failed to update admin password." });
    }
  });

  // ===================================================================
  // ==================== REAL-TIME MULTIPLAYER SYSTEM ====================
  // ===================================================================

  // Authoritative Lobby/Rooms in Server Memory
  interface RoomState {
    id: string;
    difficulty: "Easy" | "Medium" | "Hard";
    problem: Problem;
    timer: number; // seconds remaining
    isStarted: boolean;
    isFinished: boolean;
    players: {
      [socketId: string]: {
        id: string;
        username: string;
        rating: number;
        code: string;
        progress: number; // percentage of cases passed (0 - 100)
        warnings: number;
        wpm: number;
        isSubmitted: boolean;
        isFinished: boolean;
        disqualified: boolean;
      }
    };
    winnerName?: string;
    isAiGame: boolean;
  }

  const activeRooms: { [roomId: string] : RoomState } = {};
  const matchmakingQueue: { [difficulty: string]: { socketId: string; user: User }[] } = {
    Easy: [],
    Medium: [],
    Hard: []
  };

  io.on("connection", (socket) => {
    console.log(`Connected user: socket ${socket.id}`);

    let currentRoomId: string | null = null;
    let loggedInUser: User | null = null;

    // Register active user details to socket connection
    socket.on("auth-register", (user: User) => {
      loggedInUser = user;
      (socket as any).userId = user.id;
      socket.join(`user_room_${user.id}`);
      db.updateOnlineStatus(user.id, true);
      io.emit("status-update", { userId: user.id, online: true });
      console.log(`Socket ${socket.id} registers details for user ${user.username}`);
    });

    // Single Player VS AI Mode or Practice Mode Request
    socket.on("single-player-join", ({ difficulty, isPractice, user, problemId }: { difficulty: "Easy" | "Medium" | "Hard"; isPractice?: boolean; user: User; problemId?: string }) => {
      if (!user) return;
      loggedInUser = user;
      (socket as any).userId = user.id;

      // Instantly create AI Battle Room
      const roomId = (isPractice ? "practice_" : "ai_battle_") + Math.random().toString(36).substr(2, 9);
      const filteredProblems = problems.filter(p => p.difficulty === difficulty);
      let selectedProblem = filteredProblems[Math.floor(Math.random() * filteredProblems.length)];
      if (problemId) {
        const found = problems.find(p => p.id === problemId);
        if (found) {
          selectedProblem = found;
        }
      }

      const room: RoomState = {
        id: roomId,
        difficulty: selectedProblem.difficulty,
        problem: selectedProblem,
        timer: isPractice ? 999999 : 300, // unlimited retries/time for beginner practice
        isStarted: true,
        isFinished: false,
        players: {
          [socket.id]: {
            id: user.id,
            username: user.username,
            rating: user.stats.rating,
            code: selectedProblem.starterCode.javascript,
            progress: 0,
            warnings: 0,
            wpm: 0,
            isSubmitted: false,
            isFinished: false,
            disqualified: false
          },
          "ai_opponent_id": {
            id: "ai_bot",
            username: isPractice ? "Friendly AI Coach" : "AI_Elite_Competitor",
            rating: user.stats.rating + (isPractice ? -120 : Math.floor(Math.random() * 150) - 50),
            code: "",
            progress: 0,
            warnings: 0,
            wpm: isPractice ? 15 : 75,
            isSubmitted: false,
            isFinished: false,
            disqualified: false
          }
        },
        isAiGame: true
      };
      (room as any).isPractice = !!isPractice;

      activeRooms[roomId] = room;
      socket.join(roomId);

      socket.emit("match-found", {
        roomId,
        problem: selectedProblem,
        players: Object.values(room.players),
        timer: room.timer,
        isAiGame: true,
        isPractice: !!isPractice
      });

      startRoomTicker(roomId);
    });

    // Matchmaking Request (Strictly for matching with real online users)
    socket.on("matchmaking-join", ({ difficulty, user }: { difficulty: "Easy" | "Medium" | "Hard"; user: User }) => {
      if (!user) return;
      loggedInUser = user;
      (socket as any).userId = user.id;
      
      // Clear existing queues if they exist to prevent double matchmaking
      matchmakingQueue[difficulty] = matchmakingQueue[difficulty].filter(
        q => q.user.id !== user.id && q.socketId !== socket.id
      );

      // Add to queue
      matchmakingQueue[difficulty].push({ socketId: socket.id, user });
      socket.emit("matchmaking-status", { status: "searching" });
      console.log(`Queue updated for ${difficulty}: ${matchmakingQueue[difficulty].length} users`);

      // Try matching
      if (matchmakingQueue[difficulty].length >= 2) {
        const p1 = matchmakingQueue[difficulty].shift()!;
        const p2 = matchmakingQueue[difficulty].shift()!;

        // Generate dynamic multiplayer session Room
        const roomId = "battle_" + Math.random().toString(36).substr(2, 9);
        const filteredProblems = problems.filter(p => p.difficulty === difficulty);
        const randomProblem = filteredProblems[Math.floor(Math.random() * filteredProblems.length)];

        const room: RoomState = {
          id: roomId,
          difficulty: difficulty,
          problem: randomProblem,
          timer: 300, // 5 minutes standard timer
          isStarted: true,
          isFinished: false,
          players: {
            [p1.socketId]: {
              id: p1.user.id,
              username: p1.user.username,
              rating: p1.user.stats.rating,
              code: randomProblem.starterCode.javascript,
              progress: 0,
              warnings: 0,
              wpm: 0,
              isSubmitted: false,
              isFinished: false,
              disqualified: false
            },
            [p2.socketId]: {
              id: p2.user.id,
              username: p2.user.username,
              rating: p2.user.stats.rating,
              code: randomProblem.starterCode.javascript,
              progress: 0,
              warnings: 0,
              wpm: 0,
              isSubmitted: false,
              isFinished: false,
              disqualified: false
            }
          },
          isAiGame: false
        };

        activeRooms[roomId] = room;

        // Join both sockets to room channel
        const socket1 = io.sockets.sockets.get(p1.socketId);
        const socket2 = io.sockets.sockets.get(p2.socketId);

        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        io.to(roomId).emit("match-found", {
          roomId,
          problem: randomProblem,
          players: Object.values(room.players),
          timer: room.timer,
          isAiGame: false
        });

        startRoomTicker(roomId);
      }
    });

    // Leave matchmaking Queue
    socket.on("matchmaking-leave", ({ difficulty }) => {
      if (difficulty && matchmakingQueue[difficulty]) {
        matchmakingQueue[difficulty] = matchmakingQueue[difficulty].filter(q => q.socketId !== socket.id);
      }
      socket.emit("matchmaking-status", { status: "idle" });
      console.log(`Socket ${socket.id} leaves matchmaking queue.`);
    });

    // Custom Room Invite codes creator
    socket.on("custom-room-create", ({ difficulty, user }: { difficulty: "Easy" | "Medium" | "Hard"; user: User }) => {
      const roomId = "custom_" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const filteredProblems = problems.filter(p => p.difficulty === difficulty);
      const randomProblem = filteredProblems[Math.floor(Math.random() * filteredProblems.length)];

      const room: RoomState = {
        id: roomId,
        difficulty: difficulty,
        problem: randomProblem,
        timer: 480, // 8 minutes custom room timer
        isStarted: false,
        isFinished: false,
        players: {
          [socket.id]: {
            id: user.id,
            username: user.username,
            rating: user.stats.rating,
            code: randomProblem.starterCode.javascript,
            progress: 0,
            warnings: 0,
            wpm: 0,
            isSubmitted: false,
            isFinished: false,
            disqualified: false
          }
        },
        isAiGame: false
      };

      activeRooms[roomId] = room;
      socket.join(roomId);

      socket.emit("custom-room-created", { roomId, players: Object.values(room.players), difficulty });
    });

    // Join custom battle via invite code
    socket.on("custom-room-join", ({ inviteCode, user }: { inviteCode: string; user: User }) => {
      const room = activeRooms[inviteCode];
      if (!room) {
        socket.emit("custom-room-error", { error: "Match lobby not found or invite code expired." });
        return;
      }
      if (Object.keys(room.players).length >= 2) {
        socket.emit("custom-room-error", { error: "Lobby is full (maximum 2 participants)." });
        return;
      }

      room.players[socket.id] = {
        id: user.id,
        username: user.username,
        rating: user.stats.rating,
        code: room.problem.starterCode.javascript,
        progress: 0,
        warnings: 0,
        wpm: 0,
        isSubmitted: false,
        isFinished: false,
        disqualified: false
      };

      socket.join(inviteCode);
      io.to(inviteCode).emit("custom-room-updated", { players: Object.values(room.players) });

      // Start custom match triggers automatically
      room.isStarted = true;
      io.to(inviteCode).emit("match-found", {
        roomId: inviteCode,
        problem: room.problem,
        players: Object.values(room.players),
        timer: room.timer,
        isAiGame: false
      });

      startRoomTicker(inviteCode);
    });

    // Keep code editor buffers synced
    socket.on("code-sync", ({ roomId, code, progress }: { roomId: string; code: string; progress: number }) => {
      const room = activeRooms[roomId];
      if (!room) return;

      const player = room.players[socket.id];
      if (player) {
        player.code = code;
        player.progress = progress;
        
        // Broadcast updates to opponent
        socket.to(roomId).emit("opponent-sync", {
          socketId: socket.id,
          progress,
          codeLength: code.length,
          code
        });
      }
    });

    // Sockets Chats handling
    socket.on("chat-message", async ({ roomId, message, senderName }: { roomId: string; message: string; senderName: string }) => {
      const room = activeRooms[roomId];
      if (!room) return;

      const chat: ChatMessage = {
        id: "c_" + Math.random().toString(36).substr(2, 9),
        senderId: loggedInUser?.id || "anonymous",
        lobbyId: roomId,
        senderName: senderName,
        message: message,
        timestamp: new Date().toISOString()
      };

      db.addChatMessage(chat);
      io.to(roomId).emit("chat-message", chat);

      // AI auto responder triggers if playing VS AI
      if (room.isAiGame) {
        const userState = room.players[socket.id];
        const aiState = room.players["ai_opponent_id"];
        const isPractice = !!(room as any).isPractice || roomId.startsWith("practice_");
        
        if (userState && aiState) {
          // Delay response for realism
          setTimeout(async () => {
            let reply = "";
            let senderName = "AI_Elite_Competitor";
            
            if (isPractice) {
              senderName = "Friendly AI Coach";
              reply = await generateAiMentorChat(
                room.problem.title,
                room.problem.description || "",
                userState.code || "",
                "javascript",
                message
              );
            } else {
              reply = await generateAiOpponentChat(
                aiState.progress,
                userState.wpm || 40,
                room.problem.title,
                message
              );
            }

            const aiChat: ChatMessage = {
              id: "c_ai_" + Math.random().toString(36).substr(2, 9),
              senderId: "ai_bot",
              lobbyId: roomId,
              senderName: senderName,
              message: reply,
              timestamp: new Date().toISOString(),
              isAi: true
            };

            db.addChatMessage(aiChat);
            io.to(roomId).emit("chat-message", aiChat);
          }, 1500);
        }
      }
    });

    // Real-time Anti-cheat alerts Warnings sync
    socket.on("anti-cheat-alert", ({ roomId, type, details }: { roomId: string; type: any; details: string }) => {
      const room = activeRooms[roomId];
      if (!room || room.isFinished) return;

      const player = room.players[socket.id];
      if (!player) return;

      player.warnings++;

      const log: CheatingLog = {
        userId: player.id,
        username: player.username,
        matchId: roomId,
        type,
        details,
        timestamp: new Date().toISOString(),
        warningsCount: player.warnings
      };

      db.logCheating(log);

      // Send telemetry warning update alert to user
      socket.emit("cheating-warning", {
        warnings: player.warnings,
        maxWarnings: 3,
        details
      });

      // Synchronize warning update indicators to opponent view
      socket.to(roomId).emit("opponent-warning", {
        socketId: socket.id,
        warnings: player.warnings
      });

      // Disqualify and assign loss auto-threshold reaches!
      if (player.warnings >= 3) {
        player.disqualified = true;
        player.isFinished = true;
        
        console.log(`Disqualification triggered for ${player.username} in room ${roomId}`);
        
        // Notify room of ban/disqualification
        io.to(roomId).emit("disqualification-alert", {
          socketId: socket.id,
          username: player.username,
          details: "Disqualified automatically due to multiple anti-cheat violations (Max limit: 3 warning penalties reached)."
        });

        checkRoomFinish(roomId);
      }
    });

    // User marks coding solved successfully
    socket.on("code-final-submit", ({ roomId, wpm, accuracy }: { roomId: string; wpm: number; accuracy: number }) => {
      const room = activeRooms[roomId];
      if (!room || room.isFinished) return;

      const player = room.players[socket.id];
      if (player) {
        player.isSubmitted = true;
        player.isFinished = true;
        player.progress = 100;
        player.wpm = wpm;

        // Broadcast metrics
        io.to(roomId).emit("opponent-sync", {
          socketId: socket.id,
          progress: 100,
          codeLength: player.code.length
        });

        checkRoomFinish(roomId);
      }
    });

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      console.log(`Disconnected client socket ${socket.id}`);
      
      if (loggedInUser) {
        const activeSockets = Array.from(io.sockets.sockets.values());
        const stillConnected = activeSockets.some(s => (s as any).userId === loggedInUser!.id && s.id !== socket.id);
        if (!stillConnected) {
          db.updateOnlineStatus(loggedInUser.id, false);
          io.emit("status-update", { userId: loggedInUser.id, online: false });
        }
      }

      // Clear matchmaking queues
      Object.keys(matchmakingQueue).forEach(diff => {
        matchmakingQueue[diff] = matchmakingQueue[diff].filter(q => q.socketId !== socket.id);
      });

      // Terminate room gracefully or declare opponent winning
      Object.keys(activeRooms).forEach(roomId => {
        const room = activeRooms[roomId];
        const player = room.players[socket.id];
        if (player && !room.isFinished) {
          player.isFinished = true;
          player.progress = 0;
          
          if (!room.isFinished) {
            socket.to(roomId).emit("opponent-abandoned", {
              username: player.username,
              details: "Opponent closed window or connection timed out."
            });
            checkRoomFinish(roomId);
          }
        }
      });
    });
  });

  // AUTHORITATIVE ROOM TIMER TICKERS
  function startRoomTicker(roomId: string) {
    let aiCooldown = 0; // Simulated thinking pauses (seconds of typing stall)

    const ticker = setInterval(() => {
      const room = activeRooms[roomId];
      if (!room || room.isFinished) {
        clearInterval(ticker);
        return;
      }

      room.timer--;

      // Feed AI Opponent progression steps simulated to look incredibly lifelike!
      if (room.isAiGame && !room.isFinished) {
        const aiPlayer = room.players["ai_opponent_id"];
        if (aiPlayer && !aiPlayer.isFinished) {
          const isPractice = !!(room as any).isPractice;
          const diff = room.difficulty;

          if (aiCooldown > 0) {
            aiCooldown--;
          } else {
            // Calculate step probability and increments based on mode
            let stepProb = 0.15;
            let progressAmt = 0;
            let pauseProb = 0.10;
            let baselineWpm = 65;

            if (isPractice) {
              stepProb = 0.08; // Slower thinking
              progressAmt = Math.floor(Math.random() * 8) + 5; // Tiny code jumps
              pauseProb = 0.15; // Frequent coding pauses
              baselineWpm = 25 + Math.floor(Math.random() * 10);
            } else if (diff === "Easy") {
              stepProb = 0.12;
              progressAmt = Math.floor(Math.random() * 12) + 8;
              pauseProb = 0.10;
              baselineWpm = 35 + Math.floor(Math.random() * 15);
            } else if (diff === "Medium") {
              stepProb = 0.18;
              progressAmt = Math.floor(Math.random() * 16) + 12;
              pauseProb = 0.12;
              baselineWpm = 55 + Math.floor(Math.random() * 20);
            } else if (diff === "Hard") {
              stepProb = 0.28;
              progressAmt = Math.floor(Math.random() * 20) + 18;
              pauseProb = 0.05;
              baselineWpm = 85 + Math.floor(Math.random() * 30);
            }

            if (Math.random() < stepProb) {
              aiPlayer.progress = Math.min(100, aiPlayer.progress + progressAmt);
              aiPlayer.wpm = baselineWpm;

              io.to(roomId).emit("opponent-sync", {
                socketId: "ai_opponent_id",
                progress: aiPlayer.progress,
                codeLength: aiPlayer.progress * 11
              });

              // Occasionally stall typing for simulated developer brainstorming
              if (Math.random() < pauseProb && aiPlayer.progress < 100) {
                aiCooldown = Math.floor(Math.random() * 4) + 2; // brain stall of 2-5s
                aiPlayer.wpm = 0;
              }

              // Periodic progress commentary (encouragement for practice, spicy banter for battles)
              if (aiPlayer.progress < 100 && Math.random() > 0.6) {
                let textMsg = "";
                if (isPractice) {
                  const items = [
                    "Coach study-tip: Keep local loops lightweight to save recursion depth!",
                    "Fantastic progress! Pay close attention to final boundary conditions.",
                    "Take your time, coding is about accuracy and understanding.",
                    "Facing errors? Try standard print testing or split logic into helper steps!",
                    "Mastering core logic beats timing pressure. You've got this!"
                  ];
                  textMsg = items[Math.floor(Math.random() * items.length)];
                } else {
                  const banters = [
                    "Passing visible test suites check. Writing optimized heuristics now.",
                    "Complexity benchmark looks extremely lightweight on my end.",
                    "Loop optimizations completed. Pushing WPM threshold higher.",
                    "Semicolon check complete. Logic compiles nicely."
                  ];
                  textMsg = banters[Math.floor(Math.random() * banters.length)];
                }

                const msgBody: ChatMessage = {
                  id: "c_ai_cmt_" + Math.random().toString(36).substr(2, 9),
                  senderId: "ai_bot",
                  lobbyId: roomId,
                  senderName: isPractice ? "Friendly AI Coach" : "AI_Elite_Competitor",
                  message: textMsg,
                  timestamp: new Date().toISOString(),
                  isAi: true
                };
                db.addChatMessage(msgBody);
                io.to(roomId).emit("chat-message", msgBody);
              }

              // Final submit solved
              if (aiPlayer.progress === 100) {
                aiPlayer.isFinished = true;
                aiPlayer.isSubmitted = true;
                
                const winCmt = isPractice
                  ? "Brilliant! I've cleared the code challenges successfully. Take your time to finish and test your answer!"
                  : "Perfect! All test checks cleared. Solved!";

                const msgBody: ChatMessage = {
                  id: "c_ai_done_" + Math.random().toString(36).substr(2, 9),
                  senderId: "ai_bot",
                  lobbyId: roomId,
                  senderName: isPractice ? "Friendly AI Coach" : "AI_Elite_Competitor",
                  message: winCmt,
                  timestamp: new Date().toISOString(),
                  isAi: true
                };
                db.addChatMessage(msgBody);
                io.to(roomId).emit("chat-message", msgBody);
                checkRoomFinish(roomId);
              }
            }
          }
        }
      }

      // Synchronize timer clock
      io.to(roomId).emit("timer-tick", { timer: room.timer });

      if (room.timer <= 0) {
        clearInterval(ticker);
        room.isFinished = true;
        io.to(roomId).emit("battle-timeout", { details: "Timer run out. Match concluded." });
        declareAuthoritativeRoomResult(roomId);
      }
    }, 1000);
  }

  // Evaluate matching outcomes
  function checkRoomFinish(roomId: string) {
    const room = activeRooms[roomId];
    if (!room) return;

    const participants = Object.values(room.players);
    const allFinished = participants.every(p => p.isFinished);

    if (allFinished) {
      declareAuthoritativeRoomResult(roomId);
    }
  }

  // Room finishing: calculates ELO scaling updates and persists
  function declareAuthoritativeRoomResult(roomId: string) {
    const room = activeRooms[roomId];
    if (!room || room.isFinished) return;

    room.isFinished = true;

    const ids = Object.keys(room.players);
    if (ids.length < 2) return;

    const p1 = room.players[ids[0]];
    const p2 = room.players[ids[1]];

    let winnerId = "";
    let statusP1: "win" | "loss" | "draw" | "abandoned" = "draw";
    let statusP2: "win" | "loss" | "draw" | "abandoned" = "draw";

    // Determine outcomes
    if (p1.disqualified && p2.disqualified) {
      statusP1 = "abandoned";
      statusP2 = "abandoned";
    } else if (p1.disqualified) {
      statusP1 = "abandoned";
      statusP2 = "win";
      winnerId = p2.id;
    } else if (p2.disqualified) {
      statusP1 = "win";
      statusP2 = "abandoned";
      winnerId = p1.id;
    } else if (p1.progress > p2.progress) {
      statusP1 = "win";
      statusP2 = "loss";
      winnerId = p1.id;
    } else if (p2.progress > p1.progress) {
      statusP1 = "loss";
      statusP2 = "win";
      winnerId = p2.id;
    } else {
      // Draw condition
      statusP1 = "draw";
      statusP2 = "draw";
    }

    room.winnerName = winnerId ? (winnerId === p1.id ? p1.username : p2.username) : "Draw";

    // Save and record rating changes to DB for legitimate accounts
    let ratingChangeP1 = 0;
    let ratingChangeP2 = 0;
    const isPracticeGame = !!(room as any).isPractice || room.id.startsWith("practice_");

    if (p1.id !== "ai_bot") {
      if (!isPracticeGame) {
        ratingChangeP1 = db.updateStatsAndRating(
          p1.id,
          statusP1,
          p2.rating,
          room.difficulty,
          p1.wpm || 50,
          p1.progress === 100 ? 100 : 70
        ) || 0;
      } else {
        if (statusP1 === "win") {
          db.updateActivityStreak(p1.id);
          db.awardXP(p1.id, 40); // 40 XP for completing practice
        }
      }

      db.addMatchRecord(p1.id, {
        id: room.id,
        opponentId: p2.id,
        opponentName: p2.username,
        difficulty: room.difficulty,
        status: statusP1,
        eloChange: ratingChangeP1,
        date: new Date().toISOString(),
        problemTitle: room.problem.title,
        isPractice: isPracticeGame
      } as any);
    }

    if (p2.id !== "ai_bot") {
      if (!isPracticeGame) {
        ratingChangeP2 = db.updateStatsAndRating(
          p2.id,
          statusP2,
          p1.rating,
          room.difficulty,
          p2.wpm || 50,
          p2.progress === 100 ? 100 : 70
        ) || 0;
      } else {
        if (statusP2 === "win") {
          db.updateActivityStreak(p2.id);
          db.awardXP(p2.id, 40); // 40 XP for completing practice
        }
      }

      db.addMatchRecord(p2.id, {
        id: room.id,
        opponentId: p1.id,
        opponentName: p1.username,
        difficulty: room.difficulty,
        status: statusP2,
        eloChange: ratingChangeP2,
        date: new Date().toISOString(),
        problemTitle: room.problem.title,
        isPractice: isPracticeGame
      } as any);
    }

    // Inform both sockets of terminal matching summaries!
    io.to(roomId).emit("battle-summary", {
      winnerName: room.winnerName,
      winnerId,
      players: [
        { id: p1.id, username: p1.username, progress: p1.progress, eloChange: ratingChangeP1, disqualified: p1.disqualified },
        { id: p2.id, username: p2.username, progress: p2.progress, eloChange: ratingChangeP2, disqualified: p2.disqualified }
      ]
    });
  }

  // ==================== ASSET & COMPILED PAGE ROUTING HANDLERS ====================

  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for smooth and responsive development restarts
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Clash of Coders server running on port ${PORT}`);
  });
}

startServer();