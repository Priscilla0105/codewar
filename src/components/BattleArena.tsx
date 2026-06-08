import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Zap,
  MessageSquare,
  Clock,
  AlertCircle,
  Shield,
  Terminal,
  FileText,
  Swords,
  Bot,
  GripVertical,
  GripHorizontal,
} from "lucide-react";
import { getSocket } from "../lib/socket";
import { User, Problem, ChatMessage, ExecutionResult } from "../types";
import { useSecureContest, type Violation } from "../hooks/useSecureContest";
import CodeEditor, { getDefaultCode, SUPPORTED_LANGUAGES } from "./CodeEditor";

// ─── Types ───────────────────────────────────────────────────

interface BattleProps {
  user: User;
  roomId: string;
  problem: Problem;
  initialPlayers: any[];
  isAiGame: boolean;
  isPractice?: boolean;
  onExitBattle: () => void;
  onGameEnd?: (result: { winner: string; eloChange: number; matchData: any }) => void;
}

type TerminalTab = "output" | "tests" | "debug";

interface BattleSummary {
  winnerName: string;
  winnerId: string;
  players: {
    id: string;
    username: string;
    progress: number;
    eloChange: number;
    disqualified: boolean;
  }[];
}

// ─── Resize hook ─────────────────────────────────────────────

function usePanelResize(initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial);
  const sizeRef = useRef(initial);

  const startResize = useCallback(
    (e: React.MouseEvent, direction: 1 | -1) => {
      e.preventDefault();
      const startPos = e.clientX;
      const startSize = sizeRef.current;

      const onMove = (ev: MouseEvent) => {
        const next = Math.min(max, Math.max(min, startSize + (ev.clientX - startPos) * direction));
        sizeRef.current = next;
        setSize(next);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [min, max]
  );

  return { size, setSize, startResize };
}

function useVerticalResize(initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial);
  const sizeRef = useRef(initial);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startPos = e.clientY;
      const startSize = sizeRef.current;

      const onMove = (ev: MouseEvent) => {
        const next = Math.min(max, Math.max(min, startSize + (startPos - ev.clientY)));
        sizeRef.current = next;
        setSize(next);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [min, max]
  );

  return { size, setSize, startResize };
}

// ─── Sub-components ──────────────────────────────────────────

const ViolationWarningModal = memo(
  ({ violation, violationCount, maxViolations, onDismiss }: {
    violation: Violation | null;
    violationCount: number;
    maxViolations: number;
    onDismiss: () => void;
  }) => {
    if (!violation) return null;
    const isCritical = violationCount >= maxViolations - 1;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onDismiss} />
        <div
          className={`relative w-full max-w-sm rounded-lg border p-5 shadow-2xl ${
            isCritical ? "bg-[#1A0A0A] border-[#FF4444]" : "bg-[#111] border-[#FFC107]/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isCritical ? "text-[#FF6B6B]" : "text-[#FFC107]"}`} />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white mb-1">
                {isCritical ? "Critical Violation" : "Contest Violation Detected"}
              </h3>
              <p className="text-xs text-[#C8C8C8] mb-3 leading-relaxed">{violation.details}</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isCritical ? "bg-[#FF6B6B]" : "bg-[#FFC107]"}`}
                    style={{ width: `${(violationCount / maxViolations) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white font-serif">{violationCount}/{maxViolations}</span>
              </div>
              {isCritical && (
                <p className="text-xs text-[#FF6B6B] font-semibold mb-2">
                  One more violation will flag your submission!
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-full mt-2 px-4 py-2.5 bg-[#1C1C1C] hover:bg-[#282828] rounded text-xs font-bold text-white transition-colors border border-[#333]"
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  }
);

const FlaggedBanner = memo(({ flagReason }: { flagReason?: string }) => (
  <div className="absolute inset-0 z-[200] bg-[#FF6B6B]/15 backdrop-blur-sm flex items-center justify-center pointer-events-none">
    <div className="bg-[#1A0A0A] border-2 border-[#FF4444] rounded-lg p-8 text-center max-w-md shadow-2xl">
      <AlertTriangle className="w-10 h-10 text-[#FF6B6B] mx-auto mb-4" />
      <h2 className="text-lg font-bold text-white mb-2">Submission Flagged</h2>
      <p className="text-sm text-[#E8E8E8] mb-3">{flagReason || "Your submission has been flagged for contest violations."}</p>
      <p className="text-xs text-[#8A8A8A]">This incident has been logged and reported to administrators.</p>
    </div>
  </div>
));

const DifficultyBadge = memo(({ difficulty }: { difficulty: string }) => {
  const d = difficulty?.toLowerCase() ?? "medium";
  const styles: Record<string, string> = {
    easy: "border-[#4EC9B0]/50 text-[#4EC9B0] bg-[#4EC9B0]/10",
    medium: "border-[#FFC107]/50 text-[#FFC107] bg-[#FFC107]/10",
    hard: "border-[#FF6B6B]/50 text-[#FF6B6B] bg-[#FF6B6B]/10",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded border ${styles[d] || styles.medium}`}>
      {difficulty} Level
    </span>
  );
});

const PremiumSolvedBadge = memo(({ solved, total }: { solved: number; total: number }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141414] border border-[#2E2E2E] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    <span className="text-[13px] text-[#9A9A9A] font-serif tracking-wide">Solved:</span>
    <span className="text-[14px] font-bold text-[#4EC9B0] font-serif tabular-nums">{solved}/{total}</span>
  </div>
));

const PremiumWarningBadge = memo(({ count, max }: { count: number; max: number }) => {
  const critical = count >= max - 1;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        critical
          ? "bg-[#2A1010] border-[#FF4444] animate-pulse"
          : "bg-[#1E1410] border-[#CC3333]/70"
      }`}
    >
      <AlertTriangle className={`w-4 h-4 shrink-0 ${critical ? "text-[#FFCC00]" : "text-[#FFCC00]"}`} />
      <span className="text-[14px] font-bold text-[#FFCC00] font-serif tabular-nums">{count}/{max}</span>
    </div>
  );
});

// ─── Main component ────────────────────────────────────────────

const BATTLE_DURATION = 300;

const VIOLATION_TYPE_MAP: Record<string, string> = {
  fullscreen_exit: "fullscreen-exit",
  tab_switch: "tab-switch",
  focus_loss: "tab-switch",
  keyboard_shortcut: "devtools",
  context_menu: "paste-detect",
};

export default memo(function BattleArena({
  user,
  roomId,
  problem,
  initialPlayers,
  isAiGame,
  isPractice = false,
  onExitBattle,
  onGameEnd,
}: BattleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const battleSummaryRef = useRef<BattleSummary | null>(null);
  const codeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [code, setCode] = useState(() => problem?.starterCode?.javascript ?? getDefaultCode("javascript"));
  const [language, setLanguage] = useState("javascript");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [players, setPlayers] = useState(initialPlayers);
  const [battleFinished, setBattleFinished] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastViolation, setLastViolation] = useState<Violation | null>(null);
  const [timeLeft, setTimeLeft] = useState(BATTLE_DURATION);
  const [terminalTab, setTerminalTab] = useState<TerminalTab>("output");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [leftTab, setLeftTab] = useState<"problem" | "submissions">("problem");
  const [serverViolationCount, setServerViolationCount] = useState(0);

  const leftPanel = usePanelResize(340, 260, 520);
  const rightPanel = usePanelResize(300, 220, 440);
  const bottomPanel = useVerticalResize(200, 120, 400);

  const appendDebug = useCallback((msg: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setDebugLogs((prev) => [...prev.slice(-80), line]);
  }, []);

  const { violationCount, isFlagged, enterFullscreen } = useSecureContest({
    enabled: !isPractice,
    maxViolations: 3,
    containerRef,
    onViolation: (violation) => {
      setLastViolation(violation);
      setShowViolationModal(true);
      appendDebug(`Violation: ${violation.type} — ${violation.details}`);
    },
    onFlagParticipant: () => {
      setBattleFinished(true);
      appendDebug("Participant flagged — max violations reached");
    },
    emitSocket: (event, data) => {
      const socket = getSocket();
      if (!socket) return;
      if (event === "contest:violation") {
        socket.emit("anti-cheat-alert", {
          roomId,
          type: VIOLATION_TYPE_MAP[data.type as string] ?? "devtools",
          details: data.details,
        });
      }
    },
  });

  const displayViolationCount = Math.max(violationCount, serverViolationCount);
  const solvedCount = players.filter((p) => p.isSolved || p.progress >= 100).length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timerProgress = isPractice ? 100 : Math.max(0, (timeLeft / BATTLE_DURATION) * 100);
  const timerUrgent = !isPractice && timeLeft <= 60;

  // Auto-fullscreen on battle entry (mandatory — no manual toggle)
  useEffect(() => {
    if (!isPractice && !isFlagged && !battleFinished && containerRef.current) {
      const timer = setTimeout(() => enterFullscreen(), 150);
      return () => clearTimeout(timer);
    }
  }, [isPractice, isFlagged, battleFinished, enterFullscreen]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();

    const onTimerTick = ({ timer }: { timer: number }) => {
      if (!battleFinished) setTimeLeft(timer);
    };

    const onOpponentSync = ({ progress }: { progress: number }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id !== user.id
            ? { ...p, progress: progress ?? p.progress, isSolved: (progress ?? p.progress) >= 100 }
            : p
        )
      );
    };

    const onChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const onCheatingWarning = ({ warnings, details }: { warnings: number; details: string }) => {
      setServerViolationCount(warnings);
      appendDebug(`Server warning ${warnings}/3: ${details}`);
    };

    const onDisqualification = ({ username, details }: { username: string; details: string }) => {
      appendDebug(`Disqualification: ${username} — ${details}`);
      if (username === user.username) setBattleFinished(true);
    };

    const onBattleTimeout = ({ details }: { details: string }) => {
      appendDebug(`Battle timeout: ${details}`);
      setBattleFinished(true);
    };

    const onBattleSummary = (data: BattleSummary) => {
      battleSummaryRef.current = data;
      setPlayers((prev) =>
        prev.map((p) => {
          const updated = data.players.find((bp) => bp.id === p.id);
          return updated
            ? { ...p, progress: updated.progress, isSolved: updated.progress >= 100, disqualified: updated.disqualified }
            : p;
        })
      );
      setBattleFinished(true);
      appendDebug(`Battle ended — winner: ${data.winnerName || "Draw"}`);
    };

    const onOpponentAbandoned = ({ username, details }: { username: string; details: string }) => {
      appendDebug(`${username} abandoned: ${details}`);
    };

    socket.on("timer-tick", onTimerTick);
    socket.on("opponent-sync", onOpponentSync);
    socket.on("chat-message", onChatMessage);
    socket.on("cheating-warning", onCheatingWarning);
    socket.on("disqualification-alert", onDisqualification);
    socket.on("battle-timeout", onBattleTimeout);
    socket.on("battle-summary", onBattleSummary);
    socket.on("opponent-abandoned", onOpponentAbandoned);

    appendDebug(`Joined room ${roomId}`);

    return () => {
      socket.off("timer-tick", onTimerTick);
      socket.off("opponent-sync", onOpponentSync);
      socket.off("chat-message", onChatMessage);
      socket.off("cheating-warning", onCheatingWarning);
      socket.off("disqualification-alert", onDisqualification);
      socket.off("battle-timeout", onBattleTimeout);
      socket.off("battle-summary", onBattleSummary);
      socket.off("opponent-abandoned", onOpponentAbandoned);
    };
  }, [roomId, user.id, user.username, battleFinished, appendDebug]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Debounced code sync to server
  useEffect(() => {
    if (!code || battleFinished) return;
    if (codeSyncTimerRef.current) clearTimeout(codeSyncTimerRef.current);
    codeSyncTimerRef.current = setTimeout(() => {
      const socket = getSocket();
      const myProgress = players.find((p) => p.id === user.id)?.progress ?? 0;
      socket.emit("code-sync", { roomId, code, progress: myProgress });
    }, 1200);
    return () => {
      if (codeSyncTimerRef.current) clearTimeout(codeSyncTimerRef.current);
    };
  }, [code, roomId, battleFinished, players, user.id]);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      const starter = problem?.starterCode?.[lang as keyof typeof problem.starterCode];
      setCode(starter ?? getDefaultCode(lang));
    },
    [problem]
  );

  // Sync language state when CodeEditor triggers change via callback
  const onEditorLanguageChange = useCallback(
    (lang: string) => {
      handleLanguageChange(lang);
    },
    [handleLanguageChange]
  );

  const apiCall = useCallback(async (endpoint: string, body: object) => {
    const token = localStorage.getItem("token");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }, []);

  const handleRunCode = useCallback(async () => {
    setIsRunning(true);
    setTerminalTab("output");
    appendDebug("Running visible test cases…");
    try {
      const data = await apiCall("/api/compiler/run", {
        problemId: problem.id,
        language,
        code,
      });
      const result = data.result;
      const passed = result.status === "Accepted" ? (problem.visibleTestCases?.length ?? 1) : 0;
      const total = problem.visibleTestCases?.length ?? 1;

      setExecutionResult({
        success: result.status === "Accepted",
        output: result.actualOutput || result.status,
        error: result.status !== "Accepted" ? `${result.status}${result.actualOutput ? `: ${result.actualOutput}` : ""}` : undefined,
        executionTime: result.executionTimeMs ?? 0,
        executionTimeMs: result.executionTimeMs,
        memoryUsageKb: result.memoryUsageKb,
        testsPassed: passed,
        totalTests: total,
        failedTestCaseIndex: result.failedTestCaseIndex,
        actualOutput: result.actualOutput,
        expectedOutput: result.expectedOutput,
        verdict: result.status,
      });
      appendDebug(`Run complete — ${result.status} (${result.executionTimeMs}ms)`);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        output: "",
        error: err.message || "Execution failed",
        executionTime: 0,
      });
      appendDebug(`Run failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [apiCall, problem, language, code, appendDebug]);

  const handleSubmitCode = useCallback(async () => {
    setIsSubmitting(true);
    setTerminalTab("tests");
    appendDebug("Submitting solution…");
    try {
      const data = await apiCall("/api/compiler/submit", {
        problemId: problem.id,
        language,
        code,
        wpm: 0,
        accuracy: 100,
      });
      const result = data.result;
      const total = (problem.visibleTestCases?.length ?? 0) + (problem.hiddenTestCases?.length ?? 0);
      const passed = result.status === "Accepted" ? total : (result.failedTestCaseIndex ?? 0);

      setExecutionResult({
        success: result.status === "Accepted",
        output: result.status,
        error: result.status !== "Accepted" ? `${result.status}${result.actualOutput ? `: ${result.actualOutput}` : ""}` : undefined,
        executionTime: result.executionTimeMs ?? 0,
        executionTimeMs: result.executionTimeMs,
        memoryUsageKb: result.memoryUsageKb,
        testsPassed: passed,
        totalTests: total,
        failedTestCaseIndex: result.failedTestCaseIndex,
        actualOutput: result.actualOutput,
        expectedOutput: result.expectedOutput,
        verdict: result.status,
      });

      if (result.status === "Accepted") {
        const socket = getSocket();
        socket.emit("code-final-submit", { roomId, wpm: 0, accuracy: 100 });
        setPlayers((prev) =>
          prev.map((p) => (p.id === user.id ? { ...p, isSolved: true, progress: 100 } : p))
        );
        appendDebug("Solution accepted — all tests passed");
      } else {
        appendDebug(`Submission rejected — ${result.status}`);
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        output: "",
        error: err.message || "Submission failed",
        executionTime: 0,
      });
      appendDebug(`Submit failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [apiCall, problem, language, code, roomId, user.id, appendDebug]);

  const handleSendChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg || battleFinished) return;
    const socket = getSocket();
    socket.emit("chat-message", { roomId, message: msg, senderName: user.username });
    setChatInput("");
  }, [chatInput, roomId, user.username, battleFinished]);

  const handleExit = useCallback(() => {
    if (battleSummaryRef.current && onGameEnd) {
      const summary = battleSummaryRef.current;
      const myPlayer = summary.players.find((p) => p.id === user.id);
      onGameEnd({
        winner: summary.winnerId,
        eloChange: Math.abs(myPlayer?.eloChange ?? 0),
        matchData: summary,
      });
    } else {
      onExitBattle();
    }
  }, [onGameEnd, onExitBattle, user.id]);

  const pointsMap: Record<string, number> = { easy: 100, medium: 200, hard: 300 };
  const diffKey = problem?.difficulty?.toLowerCase() ?? "medium";
  const points = pointsMap[diffKey] ?? 200;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#050505] overflow-hidden select-none"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="h-11 bg-[#0A0A0A] border-b border-[#1E1E1E] flex items-center px-4 gap-4 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2.5">
          <Swords className="w-4 h-4 text-[#FFC107]" />
          <span className="text-[11px] font-bold text-[#FFC107] uppercase tracking-[0.14em]">CodeWar</span>
          <span className="text-[#333]">|</span>
          <span className="text-[11px] text-[#6A6A6A] uppercase tracking-wider">Battle Round</span>
          <span className="text-[10px] text-[#444] font-mono hidden sm:inline">ID: {roomId.slice(0, 12)}</span>
        </div>

        {/* Timer */}
        <div className="flex-1 flex items-center gap-3 max-w-md mx-auto">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
            timerUrgent ? "border-[#FF4444]/60 bg-[#1A0A0A]" : "border-[#2A2A2A] bg-[#111]"
          }`}>
            <Clock className={`w-3.5 h-3.5 ${timerUrgent ? "text-[#FF6B6B]" : "text-[#FFC107]"}`} />
            <span className={`text-sm font-bold font-mono tabular-nums ${
              timerUrgent ? "text-[#FF6B6B]" : "text-[#E8E8E8]"
            }`}>
              {isPractice ? "∞" : formatTime(timeLeft)}
            </span>
          </div>
          {!isPractice && (
            <div className="flex-1 h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#222]">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  timerUrgent
                    ? "bg-gradient-to-r from-[#FF4444] to-[#FF6B6B]"
                    : "bg-gradient-to-r from-[#FFC107] to-[#FFD54F]"
                }`}
                style={{ width: `${timerProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Right status badges */}
        <div className="flex items-center gap-2.5 ml-auto">
          {!isPractice && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded border border-[#2A2A2A] bg-[#111]">
              <Shield className="w-3 h-3 text-[#4EC9B0]" />
              <span className="text-[10px] text-[#6A6A6A]">Secure</span>
            </div>
          )}

          <PremiumSolvedBadge solved={solvedCount} total={players.length} />

          {!isPractice && displayViolationCount > 0 && (
            <PremiumWarningBadge count={displayViolationCount} max={3} />
          )}

          <DifficultyBadge difficulty={problem?.difficulty || "Medium"} />
        </div>
      </header>

      {/* Modals & overlays */}
      {!isPractice && (
        <ViolationWarningModal
          violation={showViolationModal ? lastViolation : null}
          violationCount={displayViolationCount}
          maxViolations={3}
          onDismiss={() => setShowViolationModal(false)}
        />
      )}
      {isFlagged && <FlaggedBanner flagReason="Multiple contest violations detected" />}

      {/* ── Main layout ───────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT — Problem panel */}
        <aside
          style={{ width: leftPanel.size }}
          className="shrink-0 flex flex-col bg-[#080808] border-r border-[#1A1A1A] overflow-hidden"
        >
          <div className="flex border-b border-[#1A1A1A] shrink-0">
            <button
              onClick={() => setLeftTab("problem")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                leftTab === "problem"
                  ? "text-[#FFC107] border-b-2 border-[#FFC107] bg-[#111]"
                  : "text-[#6A6A6A] hover:text-[#AAA]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Problem
            </button>
            <button
              onClick={() => setLeftTab("submissions")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                leftTab === "submissions"
                  ? "text-[#FFC107] border-b-2 border-[#FFC107] bg-[#111]"
                  : "text-[#6A6A6A] hover:text-[#AAA]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Submissions
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {leftTab === "problem" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <DifficultyBadge difficulty={problem?.difficulty || "Medium"} />
                  <span className="text-[10px] font-bold text-[#FFC107] uppercase tracking-wider">{points} Points</span>
                </div>

                <h1 className="text-lg font-bold text-white leading-snug tracking-tight">
                  {problem?.title || "Loading…"}
                </h1>

                {problem?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded border border-[#2A2A2A] bg-[#111] text-[#9A9A9A]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm text-[#C8C8C8] leading-relaxed">{problem?.description}</div>

                {problem?.inputFormat && (
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold text-[#FFC107] uppercase tracking-[0.12em]">Input Format</h3>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed whitespace-pre-wrap">{problem.inputFormat}</p>
                  </section>
                )}

                {problem?.outputFormat && (
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold text-[#FFC107] uppercase tracking-[0.12em]">Output Format</h3>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed whitespace-pre-wrap">{problem.outputFormat}</p>
                  </section>
                )}

                {problem?.constraints?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold text-[#FFC107] uppercase tracking-[0.12em]">Constraints</h3>
                    <ul className="space-y-1">
                      {problem.constraints.map((c: string, i: number) => (
                        <li key={i} className="text-xs text-[#A0A0A0] font-mono leading-relaxed">
                          • {c}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {(problem?.visibleTestCases?.length > 0 || problem?.sampleInput) && (
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-[#FFC107] uppercase tracking-[0.12em]">Examples</h3>
                    {problem.visibleTestCases?.length > 0
                      ? problem.visibleTestCases.map((tc, i) => (
                          <div key={i} className="space-y-2">
                            <p className="text-[10px] text-[#6A6A6A] font-semibold">Example {i + 1}</p>
                            <div>
                              <p className="text-[9px] text-[#555] uppercase mb-1">Input</p>
                              <pre className="bg-[#0A0A0A] border border-[#222] rounded px-3 py-2 text-xs text-[#4EC9B0] font-mono overflow-x-auto">
                                {tc.input}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[9px] text-[#555] uppercase mb-1">Output</p>
                              <pre className="bg-[#0A0A0A] border border-[#222] rounded px-3 py-2 text-xs text-[#66B3FF] font-mono overflow-x-auto">
                                {tc.expectedOutput}
                              </pre>
                            </div>
                          </div>
                        ))
                      : (
                        <>
                          {problem.sampleInput && (
                            <div>
                              <p className="text-[9px] text-[#555] uppercase mb-1">Sample Input</p>
                              <pre className="bg-[#0A0A0A] border border-[#222] rounded px-3 py-2 text-xs text-[#4EC9B0] font-mono overflow-x-auto">
                                {problem.sampleInput}
                              </pre>
                            </div>
                          )}
                          {problem.sampleOutput && (
                            <div>
                              <p className="text-[9px] text-[#555] uppercase mb-1">Sample Output</p>
                              <pre className="bg-[#0A0A0A] border border-[#222] rounded px-3 py-2 text-xs text-[#66B3FF] font-mono overflow-x-auto">
                                {problem.sampleOutput}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                  </section>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-[#555] text-xs">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>Submission history will appear here after you submit.</p>
                {executionResult?.verdict && (
                  <div className={`mt-4 px-3 py-2 rounded border text-left ${
                    executionResult.success ? "border-[#4EC9B0]/30 bg-[#4EC9B0]/10" : "border-[#FF6B6B]/30 bg-[#FF6B6B]/10"
                  }`}>
                    <p className={`text-xs font-bold ${executionResult.success ? "text-[#4EC9B0]" : "text-[#FF6B6B]"}`}>
                      {executionResult.verdict}
                    </p>
                    {executionResult.executionTimeMs != null && (
                      <p className="text-[10px] text-[#6A6A6A] mt-1">{executionResult.executionTimeMs}ms</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 p-3 border-t border-[#1A1A1A]">
            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || battleFinished}
              className="w-full py-2.5 bg-[#FFC107] hover:bg-[#FFD54F] disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded shadow-[0_0_16px_rgba(255,193,7,0.2)] transition-colors"
            >
              {isSubmitting ? "Submitting…" : "Submit Code"}
            </button>
          </div>
        </aside>

        {/* Left resize handle */}
        <div
          className="w-1 shrink-0 bg-[#141414] hover:bg-[#FFC107]/40 cursor-col-resize flex items-center justify-center group transition-colors"
          onMouseDown={(e) => leftPanel.startResize(e, 1)}
        >
          <GripVertical className="w-3 h-3 text-[#333] group-hover:text-[#FFC107]/60 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* CENTER — Editor + Terminal */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              onLanguageChange={onEditorLanguageChange}
              disabled={battleFinished || isFlagged}
              onRun={handleRunCode}
              onSubmit={handleSubmitCode}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              executionStats={
                executionResult
                  ? { runtime: executionResult.executionTimeMs, memory: executionResult.memoryUsageKb }
                  : undefined
              }
            />
          </div>

          {/* Terminal resize handle */}
          <div
            className="h-1 shrink-0 bg-[#141414] hover:bg-[#FFC107]/40 cursor-row-resize flex items-center justify-center group transition-colors"
            onMouseDown={bottomPanel.startResize}
          >
            <GripHorizontal className="w-3 h-3 text-[#333] group-hover:text-[#FFC107]/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* BOTTOM — Terminal */}
          <div
            style={{ height: bottomPanel.size }}
            className="shrink-0 flex flex-col bg-[#080808] border-t border-[#1A1A1A] overflow-hidden"
          >
            <div className="flex items-center border-b border-[#1A1A1A] shrink-0">
              <Terminal className="w-3.5 h-3.5 text-[#FFC107] ml-3" />
              <span className="text-[10px] font-bold text-[#FFC107] uppercase tracking-wider ml-2 py-2">Terminal Output</span>
              <div className="flex ml-4 gap-0">
                {(["output", "tests", "debug"] as TerminalTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTerminalTab(tab)}
                    className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      terminalTab === tab
                        ? "text-[#FFC107] border-b-2 border-[#FFC107]"
                        : "text-[#555] hover:text-[#888]"
                    }`}
                  >
                    {tab === "output" ? "Output" : tab === "tests" ? "Test Results" : "Debug"}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              {executionResult?.executionTimeMs != null && (
                <span className="text-[10px] text-[#555] mr-3 font-mono">{executionResult.executionTimeMs}ms</span>
              )}
              <div className="flex items-center gap-1.5 mr-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4EC9B0] animate-pulse" />
                <span className="text-[9px] text-[#555] uppercase">Stable Session</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs">
              {terminalTab === "output" && (
                <>
                  {isRunning || isSubmitting ? (
                    <div className="flex items-center gap-2 text-[#C8C8C8]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FFC107]" />
                      <span>{isRunning ? "> [PROCESS] Running test suite…" : "> [PROCESS] Submitting solution…"}</span>
                    </div>
                  ) : executionResult ? (
                    <div className="space-y-2">
                      <p className={executionResult.success ? "text-[#4EC9B0]" : "text-[#FF6B6B]"}>
                        {`> [STATUS] ${executionResult.verdict || (executionResult.success ? "Execution Successful" : "Execution Failed")}`}
                      </p>
                      {executionResult.success && executionResult.output && (
                        <pre className="text-[#C8C8C8] whitespace-pre-wrap">{`> [RESULT] ${executionResult.output}`}</pre>
                      )}
                      {executionResult.error && (
                        <pre className="text-[#FF6B6B] whitespace-pre-wrap">{`> [ERROR] ${executionResult.error}`}</pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-[#444]">{"> [LOG] Output will appear here after running tests…"}</p>
                  )}
                </>
              )}

              {terminalTab === "tests" && (
                <div className="space-y-2">
                  {executionResult ? (
                    <>
                      <p className={executionResult.success ? "text-[#4EC9B0]" : "text-[#FF6B6B]"}>
                        {`> [TESTS] ${executionResult.testsPassed ?? 0}/${executionResult.totalTests ?? 0} passed`}
                      </p>
                      {executionResult.failedTestCaseIndex != null && executionResult.failedTestCaseIndex >= 0 && (
                        <div className="space-y-1 mt-2 p-2 border border-[#FF6B6B]/20 rounded bg-[#1A0A0A]">
                          <p className="text-[#FF6B6B]">{`> Failed test case #${executionResult.failedTestCaseIndex + 1}`}</p>
                          {executionResult.expectedOutput && (
                            <p className="text-[#6A6A6A]">{`Expected: ${executionResult.expectedOutput}`}</p>
                          )}
                          {executionResult.actualOutput && (
                            <p className="text-[#6A6A6A]">{`Got: ${executionResult.actualOutput}`}</p>
                          )}
                        </div>
                      )}
                      {problem.visibleTestCases?.map((tc, i) => (
                        <div key={i} className="flex items-center gap-2 text-[#888]">
                          {executionResult.success || (executionResult.failedTestCaseIndex != null && i < executionResult.failedTestCaseIndex) ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4EC9B0]" />
                          ) : executionResult.failedTestCaseIndex === i ? (
                            <XCircle className="w-3.5 h-3.5 text-[#FF6B6B]" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-[#333]" />
                          )}
                          <span>Test {i + 1}: {tc.input.slice(0, 40)}{tc.input.length > 40 ? "…" : ""}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-[#444]">{"> [TESTS] Run or submit to see test results…"}</p>
                  )}
                </div>
              )}

              {terminalTab === "debug" && (
                <div className="space-y-0.5">
                  {debugLogs.length === 0 ? (
                    <p className="text-[#444]">{"> [DEBUG] Session logs will appear here…"}</p>
                  ) : (
                    debugLogs.map((line, i) => (
                      <p key={i} className="text-[#666] leading-relaxed">{`> ${line}`}</p>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right resize handle */}
        <div
          className="w-1 shrink-0 bg-[#141414] hover:bg-[#FFC107]/40 cursor-col-resize flex items-center justify-center group transition-colors"
          onMouseDown={(e) => rightPanel.startResize(e, -1)}
        >
          <GripVertical className="w-3 h-3 text-[#333] group-hover:text-[#FFC107]/60 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* RIGHT — Chat / AI */}
        <aside
          style={{ width: rightPanel.size }}
          className="shrink-0 flex flex-col bg-[#080808] border-l border-[#1A1A1A] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1A1A1A] shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-[#FFC107]" />
            <span className="text-[10px] font-bold text-[#FFC107] uppercase tracking-wider">Battle Chat</span>
            {isAiGame && (
              <span className="ml-auto flex items-center gap-1 text-[9px] text-[#4EC9B0]">
                <Bot className="w-3 h-3" />
                AI Active
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="p-3 rounded border border-[#1E1E1E] bg-[#0A0A0A]">
                <p className="text-[10px] text-[#FFC107] font-bold mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {isAiGame ? (isPractice ? "Friendly AI Coach" : "AI Opponent") : "System"}
                </p>
                <p className="text-[11px] text-[#6A6A6A] leading-relaxed">
                  {isAiGame
                    ? "Ask for hints or strategy tips. The AI will respond during the battle."
                    : "Chat with your opponent. Stay focused — tab switches are monitored."}
                </p>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded border text-[11px] leading-relaxed ${
                  msg.isAi
                    ? "border-[#FFC107]/20 bg-[#FFC107]/5"
                    : msg.senderId === user.id
                      ? "border-[#2A2A2A] bg-[#111] ml-4"
                      : "border-[#1E1E1E] bg-[#0A0A0A] mr-4"
                }`}
              >
                <p className={`text-[9px] font-bold mb-1 uppercase tracking-wider ${
                  msg.isAi ? "text-[#FFC107]" : "text-[#6A6A6A]"
                }`}>
                  {msg.senderName}
                </p>
                <p className="text-[#C8C8C8] whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="shrink-0 p-3 border-t border-[#1A1A1A]">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                disabled={battleFinished}
                placeholder="Send message…"
                className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#444] focus:border-[#FFC107]/40 outline-none transition-colors"
              />
              <button
                onClick={handleSendChat}
                disabled={battleFinished || !chatInput.trim()}
                className="p-2 bg-[#141414] hover:bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#FFC107]/40 rounded text-[#FFC107] disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Status bar ────────────────────────────────────── */}
      <footer className="h-7 bg-[#0A0A0A] border-t border-[#1A1A1A] flex items-center px-4 text-[10px] shrink-0">
        <span className="text-[#FFC107] font-bold uppercase tracking-wider">CodeWar Arena</span>
        <span className="mx-2 text-[#333]">•</span>
        <span className="text-[#6A6A6A]">{SUPPORTED_LANGUAGES.find((l) => l.value === language)?.label}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[#555]">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4EC9B0]" />
            Auto-saving
          </span>
          {!isPractice && (
            <span className="text-[#444]">|</span>
          )}
          {!isPractice && (
            <span>Warnings: {displayViolationCount}/3</span>
          )}
        </div>
      </footer>

      {/* ── Results modal ─────────────────────────────────── */}
      {battleFinished && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-[#FFC107]/25 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#FFC107] to-[#FFD54F] px-6 py-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-black" />
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                {isFlagged ? "Submission Flagged" : "Battle Concluded"}
              </h2>
            </div>

            <div className="p-4 space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded border ${
                    p.id === user.id
                      ? "bg-[#FFC107]/8 border-[#FFC107]/25"
                      : "bg-[#111] border-[#222]"
                  }`}
                >
                  {p.isSolved || p.progress >= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#4EC9B0] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#FF6B6B] shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-white">
                    {p.username}
                    {p.id === user.id && <span className="text-[#6A6A6A] ml-1">(you)</span>}
                  </span>
                  <span className="text-xs text-[#6A6A6A] font-mono">
                    {Math.floor(p.progress)}% · {p.currentScore ?? 0}pts
                  </span>
                </div>
              ))}
            </div>

            {isFlagged && (
              <div className="mx-4 mb-4 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded text-xs text-[#FF6B6B]">
                <p className="font-semibold mb-1">Violations Detected</p>
                <p>Your submission has been flagged for contest violations.</p>
              </div>
            )}

            <div className="px-4 pb-4">
              <button
                onClick={handleExit}
                className="w-full py-2.5 bg-[#FFC107] hover:bg-[#FFD54F] text-black font-bold text-sm rounded transition-colors shadow-[0_0_16px_rgba(255,193,7,0.2)]"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
