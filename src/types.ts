// src/types/index.ts

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  sampleInput?: string;
  sampleOutput?: string;
  _id?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
  visibleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  starterCode: {
    c: string;
    cpp: string;
    java: string;
    python: string;
    javascript: string;
  };
}

export interface UserStats {
  rating: number; // ELO
  wins: number;
  losses: number;
  draws: number;
  streak: number; // hacking streak in days
  typingWpm: number;
  accuracy: number; // percentage
  solvedEasy: number;
  solvedMedium: number;
  solvedHard: number;
  activityHistory: { date: string; solvedCount: number }[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  isBanned: boolean;
  stats: UserStats;
  avatarUrl?: string;
  name?: string;
  bio?: string;
  online?: boolean;
  lastActiveAt?: string;
  xp?: number;
  level?: number;
}

export interface LoginHistory {
  date: string;
  ipAddress: string;
  device: string;
  location: string;
}

export interface MatchHistoryEntry {
  id: string;
  opponentId: string;
  opponentName: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "win" | "loss" | "draw" | "abandoned";
  eloChange: number;
  date: string;
  problemTitle: string;
}

export interface CodeSubmission {
  id: string;
  userId: string;
  username: string;
  problemId: string;
  problemTitle: string;
  language: string;
  code: string;
  status: "Accepted" | "Wrong Answer" | "Runtime Error" | "Compilation Error" | "Time Limit Exceeded";
  executionTimeMs: number;
  memoryUsageKb: number;
  submittedAt: string;
  failedTestCaseIndex?: number;
  actualOutput?: string;
  expectedOutput?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  lobbyId: string;
  senderName: string;
  message: string;
  timestamp: string;
  isAi?: boolean;
}

export interface CheatingLog {
  userId: string;
  username: string;
  matchId?: string;
  type: "tab-switch" | "paste-detect" | "devtools" | "fullscreen-exit" | "idle";
  details: string;
  timestamp: string;
  warningsCount: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  executionTimeMs?: number;
  memoryUsageKb?: number;
  testsPassed?: number;
  totalTests?: number;
  failedTestCaseIndex?: number;
  actualOutput?: string;
  expectedOutput?: string;
  verdict?: "Accepted" | "Wrong Answer" | "Runtime Error" | "Compilation Error" | "Time Limit Exceeded" | "Time Limit Exceeded";
}

export interface PlayerProgress {
  id: string;
  username: string;
  progress: number;
  submissionCount: number;
  currentScore: number;
  isSolved: boolean;
}

export interface Battle {
  id: string;
  roomId: string;
  problem: Problem;
  players: PlayerProgress[];
  status: "waiting" | "ongoing" | "finished";
  startTime?: string;
  endTime?: string;
  winner?: string;
}