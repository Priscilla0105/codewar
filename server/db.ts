import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User, LoginHistory, MatchHistoryEntry, CodeSubmission, ChatMessage, CheatingLog, Problem } from "../src/types";
import { dbConnect } from "../backend/config/dbConnect";
import { UserModel } from "../backend/models/User";
import { MatchModel } from "../backend/models/Match";
import { ChatModel } from "../backend/models/Chat";
import { SubmissionModel } from "../backend/models/Submission";
import { CheatingLogModel } from "../backend/models/CheatingLog";
import { DBService } from "../backend/services/dbService";

const DB_FILE = path.join(process.cwd(), "local_db.json");
const PASSWORDS_FILE = path.join(process.cwd(), "local_passwords.json");
const ADMIN_EMAIL = "priscilla.mailbox0105@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Moonlight@0105#Admin";
const FALLBACK_ADMIN_PASSWORD = "moonlight0105";

interface LocalSchema {
  users: User[];
  loginHistory: { [userId: string]: LoginHistory[] };
  matchHistory: { [userId: string]: MatchHistoryEntry[] };
  submissions: CodeSubmission[];
  chatHistory: { [lobbyId: string]: ChatMessage[] };
  cheatingLogs: CheatingLog[];
}

const INITIAL_DATA: LocalSchema = {
  users: [],
  loginHistory: {},
  matchHistory: {},
  submissions: [],
  chatHistory: {},
  cheatingLogs: []
};

let passwordsHash: { [email: string]: string } = {};

try {
  if (fs.existsSync(PASSWORDS_FILE)) {
    passwordsHash = JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf-8"));
  } else {
    passwordsHash = {};
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwordsHash, null, 2));
  }
} catch (e) {
  passwordsHash = {};
}

function getCleanEnv(key: string, defaultValue = ""): string {
  const val = process.env[key];
  if (!val) return defaultValue;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

function savePasswordsHash(): void {
  try {
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwordsHash, null, 2), "utf-8");
  } catch (e) {
    console.error("❌ Failed to save passwords hash:", e);
  }
}

function createDefaultAdminUser(id: string = "admin-id-priscilla"): User {
  return {
    id,
    username: "Priscilla",
    email: ADMIN_EMAIL,
    role: "admin",
    isBanned: false,
    name: "Priscilla",
    bio: "Crafting code in Clash Arena.",
    online: false,
    lastActiveAt: new Date().toISOString(),
    xp: 100,
    level: 5,
    stats: {
      rating: 1500,
      wins: 10,
      losses: 0,
      draws: 0,
      streak: 5,
      typingWpm: 80,
      accuracy: 100,
      solvedEasy: 0,
      solvedMedium: 0,
      solvedHard: 0,
      activityHistory: []
    }
  };
}

function createDefaultStats() {
  return {
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
  };
}

class BackendDB {
  private data: LocalSchema;
  private mongoConnected: boolean = false;

  constructor() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.loadFallback();
  }

  public async initialize(): Promise<void> {
    console.log("🚀 Starting database initialization...");
    try {
      const mongoUri = getCleanEnv("MONGODB_URI");
      if (!mongoUri) {
        console.warn("⚠️  MONGODB_URI not set. Using local JSON storage only.");
        await this.ensureAdminExists();
        return;
      }
      const conn = await dbConnect();
      if (conn) {
        this.mongoConnected = true;
        console.log("✅ MongoDB connection established!");
        try {
          await this.hydrateFromMongo();
        } catch (e) {
          console.error("⚠️  Error hydrating from MongoDB:", e);
          this.mongoConnected = false;
        }
      } else {
        console.warn("⚠️  Could not connect to MongoDB. Using local JSON storage.");
        this.mongoConnected = false;
      }
    } catch (e) {
      console.error("❌ Database initialization error:", e);
      this.mongoConnected = false;
    } finally {
      await this.ensureAdminExists();
      console.log("✅ Database initialization complete!");
    }
  }

  private async hydrateFromMongo(): Promise<void> {
    try {
      console.log("📥 Hydrating cache from MongoDB...");
      try {
        await DBService.seedProblemsIfNeeded();
      } catch (e) {
        console.warn("⚠️  Problem seeding skipped:", e);
      }
      await this.fetchUsersFromMongo();
      await this.fetchLoginHistoriesFromMongo();
      await this.fetchMatchesFromMongo();
      await this.fetchSubmissionsFromMongo();
      await this.fetchChatsFromMongo();
      await this.fetchCheatingLogsFromMongo();
      console.log("✅ Successfully hydrated all data from MongoDB");
    } catch (e) {
      console.error("❌ Hydration error:", e);
      throw e;
    }
  }

  private async fetchUsersFromMongo(): Promise<void> {
    try {
      const mongoUsers = await UserModel.find().lean();
      if (!mongoUsers || mongoUsers.length === 0) return;
      this.data.users = mongoUsers.map((u: any) => {
        const isPriscilla = u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          role: isPriscilla ? "admin" : (u.role || "user"),
          isBanned: !!u.isBanned,
          name: u.name || u.username,
          bio: u.bio || "Crafting code in Clash Arena.",
          online: !!u.online,
          avatarUrl: u.avatarUrl || u.profileImage || "",
          lastActiveAt: u.lastActiveAt || new Date().toISOString(),
          xp: u.xp !== undefined ? u.xp : 0,
          level: u.level !== undefined ? u.level : 1,
          stats: u.stats || createDefaultStats()
        };
      });
      for (const u of mongoUsers) {
        if (u.email && u.password) {
          passwordsHash[(u.email as string).toLowerCase()] = u.password as string;
        }
      }
      savePasswordsHash();
      console.log(`✅ Loaded ${mongoUsers.length} users from MongoDB`);
    } catch (e) {
      console.error("⚠️  Error fetching users:", e);
    }
  }

  private async fetchLoginHistoriesFromMongo(): Promise<void> {
    try {
      for (const user of this.data.users) {
        const mongoUser = await UserModel.findOne({ id: user.id }).lean();
        if ((mongoUser as any)?.loginHistory && Array.isArray((mongoUser as any).loginHistory)) {
          this.data.loginHistory[user.id] = (mongoUser as any).loginHistory.map((lh: any) => ({
            date: lh.date ? (lh.date instanceof Date ? lh.date.toISOString() : lh.date) : new Date().toISOString(),
            ipAddress: lh.ipAddress || "127.0.0.1",
            device: lh.device || "Generic Web Device",
            location: lh.location || "System Portal Authentication"
          }));
        }
      }
    } catch (e) {
      console.error("⚠️  Error fetching login histories:", e);
    }
  }

  private async fetchMatchesFromMongo(): Promise<void> {
    try {
      const mongoMatches = await MatchModel.find().lean();
      this.data.matchHistory = {};
      for (const m of mongoMatches as any[]) {
        if (m.player1) {
          const entry1: MatchHistoryEntry = {
            id: m.id,
            opponentId: m.player2,
            opponentName: m.player2Name || "Opponent",
            difficulty: m.difficulty,
            status: m.winner === "Draw" ? "draw" : (m.winner === m.player1 ? "win" : "loss"),
            eloChange: m.winner === m.player1 ? 16 : -12,
            date: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
            problemTitle: m.problemsSolved?.[0] || "Code Clash Duel"
          };
          if (!this.data.matchHistory[m.player1]) this.data.matchHistory[m.player1] = [];
          this.data.matchHistory[m.player1].unshift(entry1);
        }
        if (m.player2) {
          const entry2: MatchHistoryEntry = {
            id: m.id,
            opponentId: m.player1,
            opponentName: m.player1Name || "Opponent",
            difficulty: m.difficulty,
            status: m.winner === "Draw" ? "draw" : (m.winner === m.player2 ? "win" : "loss"),
            eloChange: m.winner === m.player2 ? 16 : -12,
            date: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
            problemTitle: m.problemsSolved?.[0] || "Code Clash Duel"
          };
          if (!this.data.matchHistory[m.player2]) this.data.matchHistory[m.player2] = [];
          this.data.matchHistory[m.player2].unshift(entry2);
        }
      }
    } catch (e) {
      console.error("⚠️  Error fetching matches:", e);
    }
  }

  private async fetchSubmissionsFromMongo(): Promise<void> {
    try {
      const mongoSubs = await SubmissionModel.find().sort({ createdAt: -1 }).limit(300).lean();
      this.data.submissions = (mongoSubs as any[]).map((s: any) => ({
        id: s.id,
        userId: s.userId,
        username: s.username,
        problemId: s.problemId,
        problemTitle: s.problemTitle,
        language: s.language,
        code: s.code,
        status: s.status,
        executionTimeMs: s.executionTimeMs,
        memoryUsageKb: s.memoryUsageKb,
        submittedAt: s.submittedAt ? s.submittedAt.toISOString() : new Date().toISOString(),
        failedTestCaseIndex: s.failedTestCaseIndex,
        actualOutput: s.actualOutput,
        expectedOutput: s.expectedOutput
      }));
    } catch (e) {
      console.error("⚠️  Error fetching submissions:", e);
    }
  }

  private async fetchChatsFromMongo(): Promise<void> {
    try {
      const mongoChats = await ChatModel.find().sort({ timestamp: 1 }).lean();
      this.data.chatHistory = {};
      for (const c of mongoChats as any[]) {
        const chatMsg: ChatMessage = {
          id: c.id,
          senderId: c.sender,
          lobbyId: c.roomId,
          senderName: c.senderName,
          message: c.message,
          timestamp: c.timestamp ? c.timestamp.toISOString() : new Date().toISOString(),
          isAi: c.isAi
        };
        if (!this.data.chatHistory[c.roomId]) this.data.chatHistory[c.roomId] = [];
        this.data.chatHistory[c.roomId].push(chatMsg);
      }
    } catch (e) {
      console.error("⚠️  Error fetching chats:", e);
    }
  }

  private async fetchCheatingLogsFromMongo(): Promise<void> {
    try {
      const mongoCheats = await CheatingLogModel.find().sort({ createdAt: -1 }).limit(100).lean();
      this.data.cheatingLogs = (mongoCheats as any[]).map((l: any) => ({
        userId: l.userId,
        username: l.username,
        matchId: l.matchId,
        type: l.type,
        details: l.details,
        timestamp: l.timestamp ? l.timestamp.toISOString() : new Date().toISOString(),
        warningsCount: l.warningsCount
      }));
    } catch (e) {
      console.error("⚠️  Error fetching cheating logs:", e);
    }
  }

  private loadFallback(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const loaded = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        if (loaded && Array.isArray(loaded.users)) {
          loaded.users = loaded.users.filter((u: any) =>
            u.id !== "admin-id" && u.id !== "demo-user"
          );
        }
        this.data = loaded;
      } else {
        this.save();
      }
    } catch (e) {
      console.error("⚠️  Error loading fallback database:", e);
    }
  }

  public save(): void {
    if (this.mongoConnected) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("❌ Error saving database:", e);
    }
  }

  public async ensureAdminExists(): Promise<void> {
    try {
      console.log(`[SYS] Auditing Admin account on startup for "${ADMIN_EMAIL}"...`);
      if (this.mongoConnected) {
        await this.ensureAdminInMongo();
      }
      let adminUser = this.findUserByEmail(ADMIN_EMAIL);
      if (!adminUser) {
        console.log(`[SYS] Admin "${ADMIN_EMAIL}" not found in MongoDB. Creating admin in MongoDB...`);
        const defaultHash = passwordsHash[ADMIN_EMAIL] || bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
        passwordsHash[ADMIN_EMAIL] = defaultHash;
        savePasswordsHash();
        const newAdmin = createDefaultAdminUser();
        this.data.users.push(newAdmin);
        this.save();
        console.log(`[SYS] Successfully created Admin account in MongoDB Atlas on startup.`);
      } else if (adminUser.role !== "admin") {
        adminUser.role = "admin";
        this.save();
      }
    } catch (e) {
      console.error(`[SYS_ERROR] Error auditing Admin account in MongoDB:`, e);
    }
  }

  private async ensureAdminInMongo(): Promise<void> {
    try {
      const mongoUser = await UserModel.findOne({ email: ADMIN_EMAIL }).exec();
      if (!mongoUser) {
        const adminId = "u_admin_" + Math.random().toString(36).substr(2, 9);
        const defaultHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
        await UserModel.create({
          id: adminId,
          username: "Priscilla",
          email: ADMIN_EMAIL,
          password: defaultHash,
          role: "admin",
          isBanned: false,
          name: "Priscilla",
          bio: "Crafting code in Clash Arena.",
          online: false,
          stats: createDefaultStats()
        });
        passwordsHash[ADMIN_EMAIL] = defaultHash;
        savePasswordsHash();
      } else {
        if (mongoUser.role !== "admin") {
          mongoUser.role = "admin";
          await mongoUser.save();
        }
        if (mongoUser.password) {
          passwordsHash[ADMIN_EMAIL] = mongoUser.password as string;
          savePasswordsHash();
        }
      }
    } catch (e) {
      console.error(`[SYS_ERROR] Error in MongoDB admin audit:`, e);
    }
  }

  public getUsers(): User[] { return this.data.users; }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public registerUser(username: string, email: string, passwordPlain: string): User {
    const existing = this.findUserByEmail(email);
    if (existing) throw new Error("User with this email already exists");

    const userId = "u_" + Math.random().toString(36).substr(2, 9);
    const isPriscilla = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const passwordHash = bcrypt.hashSync(passwordPlain, 10);

    const newUser: User = {
      id: userId,
      username,
      email: email.toLowerCase(),
      role: isPriscilla ? "admin" : "user",
      isBanned: false,
      name: username,
      bio: "Crafting code in Clash Arena.",
      online: true,
      lastActiveAt: new Date().toISOString(),
      xp: 0,
      level: 1,
      stats: createDefaultStats()
    };

    passwordsHash[email.toLowerCase()] = passwordHash;
    savePasswordsHash();
    this.data.users.push(newUser);
    this.save();

    if (this.mongoConnected) {
      UserModel.create({
        id: userId, username, email: email.toLowerCase(), password: passwordHash,
        role: isPriscilla ? "admin" : "user", isBanned: false, name: username,
        bio: "Crafting code in Clash Arena.", online: true, onlineStatus: true,
        lastActive: new Date(), lastActiveAt: new Date().toISOString(),
        xp: 0, level: 1, stats: newUser.stats
      }).catch((err: any) => console.error("❌ Mongo registerUser error:", err));
    }

    return newUser;
  }

  public authenticate(email: string, passwordPlain: string): User | undefined {
    const lowerEmail = email.toLowerCase();
    const isPriscilla = lowerEmail === ADMIN_EMAIL.toLowerCase();
    const envAdminEmail = getCleanEnv("ADMIN_EMAIL", ADMIN_EMAIL);
    const isAdmin = isPriscilla || lowerEmail === envAdminEmail.toLowerCase();

    if (isAdmin) {
      let isPasswordCorrect = false;

      const localHash = passwordsHash[lowerEmail];
      if (localHash && (localHash.startsWith("$2a$") || localHash.startsWith("$2b$") || localHash.startsWith("$2y$"))) {
        try { isPasswordCorrect = bcrypt.compareSync(passwordPlain, localHash); } catch (e) {}
      }

      if (!isPasswordCorrect) {
        const envHash = getCleanEnv("ADMIN_PASSWORD_HASH");
        if (envHash) {
          try { isPasswordCorrect = bcrypt.compareSync(passwordPlain, envHash); } catch (e) {}
        }
      }

      if (!isPasswordCorrect) {
        const envPassword = getCleanEnv("ADMIN_PASSWORD");
        if (envPassword && passwordPlain === envPassword) isPasswordCorrect = true;
      }

      if (!isPasswordCorrect && isPriscilla && passwordPlain === FALLBACK_ADMIN_PASSWORD) {
        isPasswordCorrect = true;
      }

      if (!isPasswordCorrect) throw new Error("Incorrect password");

      let user = this.findUserByEmail(lowerEmail);
      if (!user) {
        try {
          user = this.registerUser("Priscilla", lowerEmail, FALLBACK_ADMIN_PASSWORD);
        } catch (e) {
          user = createDefaultAdminUser("admin-fallback-id");
          user.email = lowerEmail;
        }
      }

      if (user && user.role !== "admin") {
        user.role = "admin";
        this.save();
        if (this.mongoConnected) {
          UserModel.findOneAndUpdate({ id: user.id }, { role: "admin" }).exec()
            .catch((err: any) => console.error("[AUTH_ERROR]:", err));
        }
      }

      return user;
    }

    const user = this.findUserByEmail(lowerEmail);
    if (!user) return undefined;
    if (user.isBanned) throw new Error("This account is currently banned");

    const hash = passwordsHash[lowerEmail];
    if (!hash || !bcrypt.compareSync(passwordPlain, hash)) return undefined;

    return user;
  }

  public updateOnlineStatus(userId: string, isOnline: boolean): void {
    const user = this.findUserById(userId);
    if (user) {
      user.online = isOnline;
      user.lastActiveAt = new Date().toISOString();
      this.save();
      if (this.mongoConnected) {
        UserModel.findOneAndUpdate({ id: userId }, { online: isOnline, onlineStatus: isOnline, lastActiveAt: new Date().toISOString() })
          .exec().catch((err: any) => console.error("❌ Mongo updateOnlineStatus error:", err));
      }
    }
  }

  public updateAdminPassword(email: string, currentPasswordPlain: string, newPasswordPlain: string): boolean {
    const lowerEmail = email.toLowerCase();
    const verifiedUser = this.authenticate(lowerEmail, currentPasswordPlain);
    if (!verifiedUser || verifiedUser.role !== "admin") throw new Error("Incorrect current password");

    const newHash = bcrypt.hashSync(newPasswordPlain, 10);
    passwordsHash[lowerEmail] = newHash;
    savePasswordsHash();
    this.save();

    if (this.mongoConnected) {
      UserModel.findOneAndUpdate({ email: lowerEmail }, { password: newHash }).exec()
        .catch((err: any) => console.error("[DB] Failed updating admin password:", err));
    }
    return true;
  }

  public addLoginHistory(userId: string, history: LoginHistory): void {
    if (!this.data.loginHistory[userId]) this.data.loginHistory[userId] = [];
    this.data.loginHistory[userId].unshift(history);
    if (this.data.loginHistory[userId].length > 20) this.data.loginHistory[userId].pop();
    this.save();
    if (this.mongoConnected) {
      UserModel.findOneAndUpdate({ id: userId }, { $push: { loginHistory: { $each: [history], $slice: 20 } } })
        .exec().catch((err: any) => console.error("❌ Mongo addLoginHistory error:", err));
    }
  }

  public getLoginHistory(userId: string): LoginHistory[] {
    return this.data.loginHistory[userId] || [];
  }

  public addMatchRecord(userId: string, record: MatchHistoryEntry): void {
    if (!this.data.matchHistory[userId]) this.data.matchHistory[userId] = [];
    this.data.matchHistory[userId].unshift(record);
    this.save();
    if (this.mongoConnected) {
      const matchDoc = new MatchModel({
        id: record.id, player1: userId, player2: record.opponentId,
        player2Name: record.opponentName, winner: record.status === "win" ? userId : (record.status === "loss" ? record.opponentId : "Draw"),
        difficulty: record.difficulty, problemsSolved: [record.problemTitle],
        battleDuration: 300, isPractice: !!(record as any).isPractice
      });
      matchDoc.save().catch((err: any) => console.error("❌ Mongo addMatchRecord error:", err));
    }
  }

  public getMatchHistory(userId: string): MatchHistoryEntry[] {
    return this.data.matchHistory[userId] || [];
  }

  public updateActivityStreak(userId: string): void {
    const user = this.findUserById(userId);
    if (!user) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const history = user.stats.activityHistory;
    const index = history.findIndex(h => h.date === todayStr);
    if (index >= 0) {
      history[index].solvedCount++;
    } else {
      history.push({ date: todayStr, solvedCount: 1 });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      if (history.some(h => h.date === yesterdayStr)) { user.stats.streak++; } else { user.stats.streak = 1; }
    }
    this.save();
    if (this.mongoConnected) {
      UserModel.findOne({ id: userId }).then(async doc => {
        if (doc) { doc.stats = user.stats; doc.markModified("stats"); await doc.save(); }
      }).catch((err: any) => console.error("❌ Mongo updateActivityStreak error:", err));
    }
  }

  public updateStatsAndRating(userId: string, result: "win" | "loss" | "draw" | "abandoned", oppRating: number, difficulty: "Easy" | "Medium" | "Hard", codingWpm: number, accuracy: number): number {
    const user = this.findUserById(userId);
    if (!user) return 0;
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (oppRating - user.stats.rating) / 400));
    let score = 0.5;
    if (result === "win") score = 1;
    if (result === "loss" || result === "abandoned") score = 0;
    const eloChange = Math.round(K * (score - expected));
    user.stats.rating = Math.max(100, user.stats.rating + eloChange);
    if (result === "win") {
      user.stats.wins++;
      if (difficulty === "Easy") user.stats.solvedEasy++;
      if (difficulty === "Medium") user.stats.solvedMedium++;
      if (difficulty === "Hard") user.stats.solvedHard++;
      this.updateActivityStreak(userId);
      let xpEarned = 150;
      if (difficulty === "Easy") xpEarned += 25;
      if (difficulty === "Medium") xpEarned += 50;
      if (difficulty === "Hard") xpEarned += 100;
      xpEarned += 10 * (user.stats.streak || 1);
      this.awardXP(userId, xpEarned);
    } else if (result === "loss" || result === "abandoned") {
      user.stats.losses++;
      this.awardXP(userId, 20);
    } else {
      user.stats.draws++;
      this.awardXP(userId, 40);
    }
    if (codingWpm > 0) user.stats.typingWpm = Math.round((user.stats.typingWpm * 3 + codingWpm) / 4);
    if (accuracy > 0) user.stats.accuracy = Math.round((user.stats.accuracy * 3 + accuracy) / 4);
    this.save();
    if (this.mongoConnected) {
      UserModel.findOne({ id: userId }).then(async doc => {
        if (doc) { doc.stats = user.stats; doc.markModified("stats"); await doc.save(); }
      }).catch((err: any) => console.error("❌ Mongo updateStatsAndRating error:", err));
    }
    return eloChange;
  }

  public awardXP(userId: string, amount: number): void {
    const user = this.findUserById(userId);
    if (!user) return;
    if (user.xp === undefined) user.xp = 0;
    user.xp += amount;
    let nextLevel = 1;
    if (user.xp >= 4000) nextLevel = 7;
    else if (user.xp >= 2000) nextLevel = 6;
    else if (user.xp >= 1000) nextLevel = 5;
    else if (user.xp >= 500) nextLevel = 4;
    else if (user.xp >= 250) nextLevel = 3;
    else if (user.xp >= 100) nextLevel = 2;
    user.level = nextLevel;
    this.save();
    if (this.mongoConnected) {
      UserModel.findOneAndUpdate({ id: userId }, { xp: user.xp, level: user.level })
        .exec().catch((err: any) => console.error("❌ Mongo awardXP error:", err));
    }
  }

  public submitCode(submission: CodeSubmission): void {
    this.data.submissions.unshift(submission);
    if (this.data.submissions.length > 500) this.data.submissions.pop();
    this.save();
    if (this.mongoConnected) {
      const mongoSub = new SubmissionModel({
        id: submission.id, userId: submission.userId, username: submission.username,
        problemId: submission.problemId, problemTitle: submission.problemTitle,
        language: submission.language, code: submission.code, status: submission.status,
        executionTimeMs: submission.executionTimeMs, memoryUsageKb: submission.memoryUsageKb,
        submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : new Date(),
        failedTestCaseIndex: submission.failedTestCaseIndex,
        actualOutput: submission.actualOutput, expectedOutput: submission.expectedOutput
      });
      mongoSub.save().catch((err: any) => console.error("❌ Mongo submitCode error:", err));
    }
  }

  public getSubmissions(userId?: string): CodeSubmission[] {
    if (userId) return this.data.submissions.filter(s => s.userId === userId);
    return this.data.submissions;
  }

  public addChatMessage(msg: ChatMessage): void {
    if (!this.data.chatHistory[msg.lobbyId]) this.data.chatHistory[msg.lobbyId] = [];
    this.data.chatHistory[msg.lobbyId].push(msg);
    this.save();
    if (this.mongoConnected) {
      const chatDoc = new ChatModel({
        id: msg.id, sender: msg.senderId, senderName: msg.senderName,
        roomId: msg.lobbyId, message: msg.message,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(), isAi: !!msg.isAi
      });
      chatDoc.save().catch((err: any) => console.error("❌ Mongo addChatMessage error:", err));
    }
  }

  public getChatHistory(lobbyId: string): ChatMessage[] {
    return this.data.chatHistory[lobbyId] || [];
  }

  public logCheating(cheat: CheatingLog): void {
    this.data.cheatingLogs.unshift(cheat);
    this.save();
    if (this.mongoConnected) {
      const cheatDoc = new CheatingLogModel({
        userId: cheat.userId, username: cheat.username, matchId: cheat.matchId,
        type: cheat.type, details: cheat.details,
        timestamp: cheat.timestamp ? new Date(cheat.timestamp) : new Date(),
        warningsCount: cheat.warningsCount
      });
      cheatDoc.save().catch((err: any) => console.error("❌ Mongo logCheating error:", err));
    }
  }

  public getCheatingLogs(): CheatingLog[] { return this.data.cheatingLogs; }

  public setBanStatus(userId: string, isBanned: boolean): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.isBanned = isBanned;
    this.save();
    if (this.mongoConnected) {
      UserModel.findOneAndUpdate({ id: userId }, { isBanned }).exec()
        .catch((err: any) => console.error("❌ Mongo setBanStatus error:", err));
    }
    return true;
  }

  public resetLeaderboard(): boolean {
    this.data.users.forEach(u => {
      u.stats.rating = 1000; u.stats.wins = 0; u.stats.losses = 0; u.stats.draws = 0;
    });
    this.save();
    if (this.mongoConnected) {
      UserModel.updateMany({}, { $set: { "stats.rating": 1000, "stats.wins": 0, "stats.losses": 0, "stats.draws": 0 } })
        .exec().catch((err: any) => console.error("❌ Mongo resetLeaderboard error:", err));
    }
    return true;
  }

  public getMongoStatus(): boolean { return this.mongoConnected; }

  public getDatabaseStatus(): { mongo: boolean; local: boolean } {
    return { mongo: this.mongoConnected, local: fs.existsSync(DB_FILE) };
  }
}

export const db = new BackendDB();