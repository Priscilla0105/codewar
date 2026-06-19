import { UserModel } from "../models/User";
import { MatchModel } from "../models/Match";
import { ChatModel } from "../models/Chat";
import { ProblemModel } from "../models/Problem";
import { SubmissionModel } from "../models/Submission";
import { CheatingLogModel } from "../models/CheatingLog";
import { problems as defaultProblems } from "../../src/data/problems";
import { 
  User, 
  LoginHistory, 
  MatchHistoryEntry, 
  CodeSubmission, 
  ChatMessage, 
  CheatingLog, 
  Problem 
} from "../../src/types";

export class DBService {
  /**
   * Automatically initializes the MongoDB Database collections with standard coding problems if empty.
   */
  public static async seedProblemsIfNeeded() {
    try {
      const count = await ProblemModel.countDocuments();
      if (count === 0) {
        console.log("🌱 Database is empty. Seeding standard problems from local dataset...");
        for (const prob of defaultProblems) {
          await ProblemModel.findOneAndUpdate(
            { id: prob.id },
            {
              id: prob.id,
              title: prob.title,
              description: prob.description,
              difficulty: prob.difficulty,
              tags: prob.tags,
              constraints: prob.constraints,
              inputFormat: prob.inputFormat,
              outputFormat: prob.outputFormat,
              visibleTestCases: prob.visibleTestCases,
              hiddenTestCases: prob.hiddenTestCases,
              starterCode: prob.starterCode
            },
            { upsert: true, new: true }
          );
        }
        console.log(`✅ successfully seeded ${defaultProblems.length} coding problems into MongoDB Atlas.`);
      }
    } catch (err) {
      console.error("❌ Problem database seeding failed:", err);
    }
  }

  // --- USER CONTROLLER OPERATIONS ---
  public static async getUsers(): Promise<User[]> {
    const mongoUsers = await UserModel.find({ isBanned: { $ne: true } }).lean();
    return mongoUsers as any;
  }

  public static async findUserById(id: string): Promise<User | null> {
    const user = await UserModel.findOne({ id }).lean();
    return user as any;
  }

  public static async findUserByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return user as any;
  }

  public static async registerUser(userId: string, username: string, email: string, passwordHash: string): Promise<User> {
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const newUserDoc = new UserModel({
      id: userId,
      username,
      email: email.toLowerCase(),
      password: passwordHash,
      role: "user",
      isBanned: false,
      name: username,
      bio: "Crafting code in Clash Arena.",
      online: true,
      onlineStatus: true,
      lastActive: new Date(),
      lastActiveAt: new Date().toISOString(),
      stats: {
        rating: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 1,
        typingWpm: 45,
        accuracy: 100,
        solvedEasy: 0,
        solvedMedium: 0,
        solvedHard: 0,
        activityHistory: []
      }
    });

    const saved = await newUserDoc.save();
    return saved.toJSON() as any;
  }

  public static async updateOnlineStatus(userId: string, isOnline: boolean) {
    await UserModel.findOneAndUpdate(
      { id: userId },
      { 
        online: isOnline,
        onlineStatus: isOnline,
        lastActive: new Date(),
        lastActiveAt: new Date().toISOString()
      },
      { new: true }
    );
  }

  public static async addLoginHistory(userId: string, log: LoginHistory) {
    await UserModel.findOneAndUpdate(
      { id: userId },
      { 
        $push: { 
          loginHistory: {
            $each: [log],
            $slice: 20 // Keep last 20 logins
          } 
        } 
      }
    );
  }

  public static async getLoginHistory(userId: string): Promise<LoginHistory[]> {
    const user = await UserModel.findOne({ id: userId }).select("loginHistory").lean();
    return (user?.loginHistory || []) as any;
  }

  public static async updateActivityStreak(userId: string) {
    const user = await UserModel.findOne({ id: userId });
    if (!user) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const history = user.stats?.activityHistory || [];
    
    const index = history.findIndex((h: any) => h.date === todayStr);
    if (index >= 0) {
      history[index].solvedCount++;
    } else {
      history.push({ date: todayStr, solvedCount: 1 });
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      const hadActivityYesterday = history.some((h: any) => h.date === yesterdayStr);
      if (hadActivityYesterday) {
        user.stats.streak = (user.stats.streak || 0) + 1;
      } else {
        user.stats.streak = 1;
      }
    }
    
    user.markModified("stats");
    await user.save();
  }

  // --- MATCH HISTORY CONTROLLER OPERATIONS ---
  public static async addMatchRecord(userId: string, record: MatchHistoryEntry) {
    const matchDoc = new MatchModel({
      id: record.id,
      player1: userId,
      player2: record.opponentId,
      player2Name: record.opponentName,
      winner: record.status === "win" ? userId : (record.status === "loss" ? record.opponentId : "Draw"),
      difficulty: record.difficulty,
      problemsSolved: [record.problemTitle],
      battleDuration: 300,
      isPractice: !!(record as any).isPractice
    });
    await matchDoc.save();
  }

  public static async getMatchHistory(userId: string): Promise<MatchHistoryEntry[]> {
    const matches = await MatchModel.find().or([
  { player1: userId },
  { player2: userId }
]).sort({ createdAt: -1 }).lean();

    return matches.map((m: any) => {
      const isPlayer1 = m.player1 === userId;
      let status: "win" | "loss" | "draw" | "abandoned" = "draw";
      
      if (m.winner === "Draw") status = "draw";
      else if (m.winner === "abandoned") status = "abandoned";
      else if (m.winner === userId) status = "win";
      else status = "loss";

      return {
        id: m.id,
        opponentId: isPlayer1 ? m.player2 : m.player1,
        opponentName: isPlayer1 ? (m.player2Name || "Opponent") : (m.player1Name || "Opponent"),
        difficulty: m.difficulty,
        status,
        eloChange: isPlayer1 ? 16 : -12, // fallback or calculated standard
        date: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
        problemTitle: m.problemsSolved?.[0] || "Coding Duel Case"
      };
    });
  }

  public static async updateStatsAndRating(
    userId: string, 
    result: "win" | "loss" | "draw" | "abandoned", 
    oppRating: number, 
    difficulty: "Easy" | "Medium" | "Hard", 
    codingWpm: number, 
    accuracy: number
  ): Promise<number> {
    const user = await UserModel.findOne({ id: userId });
    if (!user) return 0;

    const K = 32;
    const currentRating = user.stats?.rating || 1000;
    const expected = 1 / (1 + Math.pow(10, (oppRating - currentRating) / 400));
    
    let score = 0.5;
    if (result === "win") score = 1;
    if (result === "loss" || result === "abandoned") score = 0;

    const eloChange = Math.round(K * (score - expected));
    
    if (!user.stats) {
      user.stats = {
        rating: 1000, wins: 0, losses: 0, draws: 0, streak: 1, 
        typingWpm: 45, accuracy: 100, solvedEasy: 0, solvedMedium: 0, solvedHard: 0, activityHistory: []
      };
    }

    user.stats.rating = Math.max(100, currentRating + eloChange);

    if (result === "win") {
      user.stats.wins++;
      if (difficulty === "Easy") user.stats.solvedEasy++;
      if (difficulty === "Medium") user.stats.solvedMedium++;
      if (difficulty === "Hard") user.stats.solvedHard++;
      await this.updateActivityStreak(userId);
    } else if (result === "loss") {
      user.stats.losses++;
    } else {
      user.stats.draws++;
    }

    if (codingWpm > 0) {
      user.stats.typingWpm = Math.round(((user.stats.typingWpm || 45) * 3 + codingWpm) / 4);
    }
    if (accuracy > 0) {
      user.stats.accuracy = Math.round(((user.stats.accuracy || 100) * 3 + accuracy) / 4);
    }

    user.markModified("stats");
    await user.save();
    return eloChange;
  }

  // --- SUBMISSIONS CONTROLLER OPERATIONS ---
  public static async saveSubmission(sub: CodeSubmission) {
    const mongoSub = new SubmissionModel({
      id: sub.id,
      userId: sub.userId,
      username: sub.username,
      problemId: sub.problemId,
      problemTitle: sub.problemTitle,
      language: sub.language,
      code: sub.code,
      status: sub.status,
      executionTimeMs: sub.executionTimeMs,
      memoryUsageKb: sub.memoryUsageKb,
      submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : new Date(),
      failedTestCaseIndex: sub.failedTestCaseIndex,
      actualOutput: sub.actualOutput,
      expectedOutput: sub.expectedOutput
    });
    await mongoSub.save();
  }

  public static async getSubmissions(userId?: string): Promise<CodeSubmission[]> {
    const query = userId ? { userId } : {};
    const docs = await SubmissionModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return docs.map((d: any) => ({
      id: d.id,
      userId: d.userId,
      username: d.username,
      problemId: d.problemId,
      problemTitle: d.problemTitle,
      language: d.language,
      code: d.code,
      status: d.status,
      executionTimeMs: d.executionTimeMs,
      memoryUsageKb: d.memoryUsageKb,
      submittedAt: d.submittedAt ? d.submittedAt.toISOString() : new Date().toISOString(),
      failedTestCaseIndex: d.failedTestCaseIndex,
      actualOutput: d.actualOutput,
      expectedOutput: d.expectedOutput
    }));
  }

  // --- GLOBAL CHAT CONTROLLER OPERATIONS ---
  public static async addChatMessage(msg: ChatMessage) {
    const chatDoc = new ChatModel({
      id: msg.id,
      sender: msg.senderId,
      senderName: msg.senderName,
      roomId: msg.lobbyId,
      message: msg.message,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      isAi: !!msg.isAi
    });
    await chatDoc.save();
  }

  public static async getChatHistory(lobbyId: string): Promise<ChatMessage[]> {
    const chats = await ChatModel.find({ roomId: lobbyId }).sort({ timestamp: 1 }).limit(200).lean();
    return chats.map((c: any) => ({
      id: c.id,
      senderId: c.sender,
      lobbyId: c.roomId,
      senderName: c.senderName,
      message: c.message,
      timestamp: c.timestamp ? c.timestamp.toISOString() : new Date().toISOString(),
      isAi: c.isAi
    }));
  }

  // --- ANTI CHEAT SYSTEM LOGS ---
  public static async logCheating(cheat: CheatingLog) {
    const cheatDoc = new CheatingLogModel({
      userId: cheat.userId,
      username: cheat.username,
      matchId: cheat.matchId,
      type: cheat.type,
      details: cheat.details,
      timestamp: cheat.timestamp ? new Date(cheat.timestamp) : new Date(),
      warningsCount: cheat.warningsCount
    });
    await cheatDoc.save();
  }

  public static async getCheatingLogs(): Promise<CheatingLog[]> {
    const logs = await CheatingLogModel.find().sort({ createdAt: -1 }).limit(200).lean();
    return logs.map((l: any) => ({
      userId: l.userId,
      username: l.username,
      matchId: l.matchId,
      type: l.type,
      details: l.details,
      timestamp: l.timestamp ? l.timestamp.toISOString() : new Date().toISOString(),
      warningsCount: l.warningsCount
    }));
  }

  // --- ADMINISTRATIVE FUNCTIONS ---
  public static async setBanStatus(userId: string, isBanned: boolean): Promise<boolean> {
    const updated = await UserModel.findOneAndUpdate(
      { id: userId },
      { isBanned },
      { new: true }
    );
    return !!updated;
  }

  public static async resetLeaderboard(): Promise<boolean> {
    await UserModel.updateMany(
      {},
      {
        $set: {
          "stats.rating": 1000,
          "stats.wins": 0,
          "stats.losses": 0,
          "stats.draws": 0,
          "stats.streak": 1,
          "stats.solvedEasy": 0,
          "stats.solvedMedium": 0,
          "stats.solvedHard": 0
        }
      }
    );
    return true;
  }
}
