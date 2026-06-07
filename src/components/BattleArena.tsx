/**
 * CYBER ARENA - BATTLE ARENA (SECURE)
 * Enhanced with anti-cheating system, premium UI, and visual improvements
 *
 * Features:
 *   - Fullscreen enforcement with violation detection
 *   - Focus monitoring and shortcut blocking
 *   - Live violation counter with warning system
 *   - Premium dark cyber theme with glowing accents
 *   - Contest timer and progress indicators
 *   - Real-time leaderboard and room status
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import Editor from "@monaco-editor/react";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Copy,
  Check,
  Play,
  Upload,
  RefreshCw,
  ChevronDown,
  Zap,
  MessageSquare,
  Code2,
  Clock,
  X,
  AlertCircle,
  Shield,
  Eye,
  Maximize2,
} from "lucide-react";
import { getSocket } from "../lib/socket";
import { User, Problem } from "../types";
import { useSecureContest, type Violation } from "../hooks/useSecureContest";
// ─── Types ────────────────────────────────────────────────────────────────────

interface BattleProps {
  user: User;
  roomId: string;
  problem: Problem;
  initialPlayers: PlayerProgress[];
  isAiGame: boolean;
  isPractice?: boolean;
  onExitBattle: () => void;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  testsPassed?: number;
  totalTests?: number;
}

interface PlayerProgress {
  id: string;
  username: string;
  progress: number;
  submissionCount: number;
  currentScore: number;
  isSolved: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

const LANGUAGES = [
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
];

const CODE_TEMPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    return 0;\n}`,
  java: `import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}`,
  python: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    pass\n\nsolve()`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nlet idx = 0;\nfunction solve() {}\nsolve();`,
};

// ─── Components ────────────────────────────────────────────────────────────────

const DifficultyBadge = memo(({ difficulty }: { difficulty: string }) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    easy: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
    medium: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
    hard: { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30" },
  };
  const colors = colorMap[difficulty?.toLowerCase()] ?? colorMap.medium;
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded border font-['Space_Grotesk'] ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {difficulty}
    </span>
  );
});

const ViolationWarningModal = memo(
  ({
    violation,
    violationCount,
    maxViolations,
    onDismiss,
  }: {
    violation: Violation | null;
    violationCount: number;
    maxViolations: number;
    onDismiss: () => void;
  }) => {
    if (!violation) return null;

    const isCritical = violationCount >= maxViolations - 1;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-auto">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onDismiss}
        />

        {/* Modal */}
        <div
          className={`relative w-full max-w-sm rounded-lg border-2 p-4 shadow-2xl animation-pulse ${
            isCritical
              ? "bg-red-950/80 border-red-500 glow-red"
              : "bg-[#1c1b1b] border-amber-500/50 glow-warning"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                isCritical ? "text-red-400" : "text-amber-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-white font-['Space_Grotesk'] mb-1">
                {isCritical ? "Critical Violation" : "Contest Violation Detected"}
              </h3>
              <p className="text-xs text-gray-300 mb-3">
                {violation.details}
              </p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isCritical ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{
                      width: `${(violationCount / maxViolations) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold whitespace-nowrap">
                  {violationCount}/{maxViolations}
                </span>
              </div>
              {isCritical && (
                <p className="text-xs text-red-300 font-semibold mb-3">
                  One more violation will flag your submission!
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-full mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-xs font-bold text-white transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  }
);

const FlaggedBanner = memo(({ flagReason }: { flagReason?: string }) => (
  <div className="absolute inset-0 z-[200] bg-red-950/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
    <div className="bg-red-900/90 border-2 border-red-500 rounded-lg p-6 text-center max-w-md glow-error">
      <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-3" />
      <h2 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">
        Submission Flagged
      </h2>
      <p className="text-sm text-red-100 mb-4">
        {flagReason || "Your submission has been flagged for contest violations."}
      </p>
      <p className="text-xs text-red-300">
        This incident has been logged and reported to administrators.
      </p>
    </div>
  </div>
));

const ProblemPanel = memo(({ problem }: { problem: Problem }) => (
  <div className="h-full overflow-y-auto bg-[#131313] border-r border-white/5">
    <div className="px-5 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-base font-bold text-[#e5e2e1] leading-tight font-['Space_Grotesk']">
          {problem?.title ?? "Loading…"}
        </h1>
        <DifficultyBadge difficulty={problem?.difficulty ?? "medium"} />
      </div>

      {/* Tags */}
      {problem?.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#d5c4ab] font-['Space_Grotesk'] hover:border-[#ffdca1]/30 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <div
        className="prose prose-invert prose-sm max-w-none text-[#d5c4ab] font-['JetBrains_Mono'] text-sm leading-relaxed [&_code]:bg-amber-500/15 [&_code]:px-1.5 [&_code]:rounded [&_code]:text-amber-300 [&_code]:text-xs [&_code]:font-['JetBrains_Mono']"
        dangerouslySetInnerHTML={{
          __html: problem?.description ?? "<p>Loading problem…</p>",
        }}
      />

      {/* Sample Input */}
      {problem?.sampleInput && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#9e8f78] uppercase tracking-[0.08em] font-['Space_Grotesk']">
            Input Format
          </p>
          <pre className="bg-[#1c1b1b] border border-white/10 rounded px-3 py-2 text-xs font-['JetBrains_Mono'] text-emerald-300 overflow-x-auto whitespace-pre-wrap hover:border-[#27ff97]/20 transition-colors">
            {problem.sampleInput}
          </pre>
        </div>
      )}

      {/* Sample Output */}
      {problem?.sampleOutput && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#9e8f78] uppercase tracking-[0.08em] font-['Space_Grotesk']">
            Output Format
          </p>
          <pre className="bg-[#1c1b1b] border border-white/10 rounded px-3 py-2 text-xs font-['JetBrains_Mono'] text-blue-300 overflow-x-auto whitespace-pre-wrap hover:border-blue-400/20 transition-colors">
            {problem.sampleOutput}
          </pre>
        </div>
      )}

      {/* Constraints */}
      {problem?.constraints && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#9e8f78] uppercase tracking-[0.08em] font-['Space_Grotesk']">
            Constraints
          </p>
          <div className="bg-[#1c1b1b] border border-white/10 rounded px-3 py-2 text-xs text-[#d5c4ab] space-y-1 font-['JetBrains_Mono'] hover:border-white/20 transition-colors">
            {problem.constraints
  .filter(Boolean)
  .map((c: string, i: number) => (
    <p key={i}>{c}</p>
))}
          </div>
        </div>
      )}
    </div>
  </div>
));

const TerminalPanel = memo(
  ({
    executionResult,
    isRunning,
    isSubmitting,
  }: {
    executionResult: ExecutionResult | null;
    isRunning: boolean;
    isSubmitting: boolean;
  }) => (
    <div className="h-full flex flex-col bg-[#131313] border-t border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-[#1c1b1b] shrink-0">
        <span className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em] font-['Space_Grotesk']">
          Terminal Output
        </span>
        <div className="flex-1" />
        {executionResult?.executionTime && (
          <span className="text-[9px] text-[#9e8f78]">
            {executionResult.executionTime}ms
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 font-['JetBrains_Mono'] text-xs">
        {isRunning || isSubmitting ? (
          <div className="flex items-center gap-2 text-[#d5c4ab]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ffdca1]" />
            {isRunning ? "Running code…" : "Submitting…"}
          </div>
        ) : executionResult ? (
          <div className="space-y-2">
            {executionResult.success ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-emerald-300 font-semibold mb-1">Execution Successful</p>
                  <pre className="bg-[#0e0e0e] border border-emerald-500/20 rounded p-2 overflow-auto max-h-[200px] text-emerald-300 whitespace-pre-wrap break-words">
                    {executionResult.output}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-300 font-semibold mb-1">Execution Failed</p>
                  <pre className="bg-[#0e0e0e] border border-red-500/20 rounded p-2 overflow-auto max-h-[200px] text-red-300 whitespace-pre-wrap break-words">
                    {executionResult.error || executionResult.output}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#9e8f78]">Output will appear here…</p>
        )}
      </div>
    </div>
  )
);

const EasyBotPanel = memo(
  ({
    messages,
    isThinking,
    draftMessage,
    setDraftMessage,
    onSend,
    disabled,
    bottomRef,
  }: {
    messages: ChatMessage[];
    isThinking: boolean;
    draftMessage: string;
    setDraftMessage: (msg: string) => void;
    onSend: () => void;
    disabled: boolean;
    bottomRef: React.RefObject<HTMLDivElement | null>;
  }) => (
    <div className="h-full flex flex-col bg-[#131313] border-l border-white/5">
      <div className="px-4 py-2 border-b border-white/5 bg-[#1c1b1b] shrink-0 flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#ffdca1]" />
        <span className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em] font-['Space_Grotesk']">
          Hint Bot
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-[10px] text-[#9e8f78]">No messages yet…</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-0.5">
              <p className="text-[9px] font-bold text-[#ffdca1]">{msg.senderName}</p>
              <p className="text-xs text-[#d5c4ab] leading-relaxed">{msg.message}</p>
            </div>
          ))
        )}
        {isThinking && (
          <div className="flex items-center gap-2 text-[10px] text-[#ffdca1]">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-white/5 bg-[#1c1b1b] shrink-0 space-y-2">
        <input
          type="text"
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled && draftMessage.trim()) {
              onSend();
            }
          }}
          placeholder="Ask for a hint…"
          disabled={disabled}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-[#d5c4ab] placeholder-[#9e8f78] focus:outline-none focus:border-[#ffdca1]/30 disabled:opacity-40 font-['Space_Grotesk']"
        />
        <button
          onClick={onSend}
          disabled={disabled || !draftMessage.trim() || isThinking}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-[#ffdca1]/15 hover:bg-[#ffdca1]/25 border border-[#ffdca1]/30 rounded text-[10px] text-[#ffdca1] font-bold uppercase tracking-wider disabled:opacity-40 transition-colors font-['Space_Grotesk']"
        >
          <Send className="w-3 h-3" />
          Send
        </button>
      </div>
    </div>
  )
);

const ResizeDivider = memo(
  ({ direction = "horizontal", onMouseDown }: { direction?: "horizontal" | "vertical"; onMouseDown: (e: React.MouseEvent) => void }) => (
    <div
      onMouseDown={onMouseDown}
      className={`group transition-colors cursor-${direction === "vertical" ? "col" : "row"}-resize ${
        direction === "vertical" ? "w-1 hover:w-1.5 bg-white/0 hover:bg-white/10" : "h-1 hover:h-1.5 bg-white/0 hover:bg-white/10"
      }`}
    />
  )
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default memo(function BattleArena({
  user,
  roomId,
  problem,
  initialPlayers,
  isAiGame,
  isPractice = false,
  onExitBattle,
}: BattleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Editor State
  const [code, setCode] = useState(CODE_TEMPLATES.cpp);
  const [language, setLanguage] = useState("cpp");
  const [showDropdown, setShowDropdown] = useState(false);

  // Execution State
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Battle State
  const [players, setPlayers] = useState(initialPlayers);
  const [battleFinished, setBattleFinished] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  // Resize State
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [bottomHeight, setBottomHeight] = useState(200);
  const resizingRef = useRef<"right" | "bottom" | null>(null);

  // Anti-Cheating State
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastViolation, setLastViolation] = useState<Violation | null>(null);

  // Anti-cheating hook
  const {
    violations,
    violationCount,
    isFlagged,
    isFullscreen,
    enterFullscreen,
    logViolation,
  } = useSecureContest({
    enabled: !isPractice,
    maxViolations: 3,
    containerRef,
    onViolation: (violation) => {
      setLastViolation(violation);
      setShowViolationModal(true);
    },
    onFlagParticipant: () => {
      setBattleFinished(true);
    },
    emitSocket: (event, data) => {
      const socket = getSocket();
      if (socket) {
        socket.emit(event, {
          roomId,
          userId: user.id,
          ...data,
        });
      }
    },
  });

  const currentLang = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];

  // Handlers
  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setShowDropdown(false);
    setCode(CODE_TEMPLATES[lang] ?? "");
  }, []);

  const handleRunCode = useCallback(async () => {
    setIsRunning(true);
    try {
      // Simulate API call - replace with actual backend
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setExecutionResult({
        success: true,
        output: "Program output here",
        executionTime: 45,
      });
    } catch (err) {
      setExecutionResult({
        success: false,
        output: "",
        error: "Execution failed",
        executionTime: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleSubmitCode = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setBattleFinished(true);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleSendChat = useCallback(() => {
    if (!draftMessage.trim()) return;
    setAiMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: user.id,
        senderName: "You",
        message: draftMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
    setDraftMessage("");
    setIsThinking(true);
    setTimeout(() => setIsThinking(false), 2000);
  }, [draftMessage, user.id]);

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    resizingRef.current = "right";
    e.preventDefault();
  }, []);

  const startResizeBottom = useCallback((e: React.MouseEvent) => {
    resizingRef.current = "bottom";
    e.preventDefault();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showDropdown]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;

      if (resizingRef.current === "right" && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.width - e.clientX + containerRect.left;
        if (newWidth > 200 && newWidth < 600) {
          setRightPanelWidth(newWidth);
        }
      } else if (resizingRef.current === "bottom" && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = containerRect.height - e.clientY + containerRect.top - 32; // Account for footer
        if (newHeight > 100 && newHeight < 600) {
          setBottomHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
    };

    if (resizingRef.current) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#131313] font-['Space_Grotesk'] overflow-hidden"
    >
      {/* ── Top Status Bar ────────────────────────────── */}
      <header className="h-10 bg-gradient-to-r from-[#1c1b1b] to-[#1c1b1b] border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
        {/* Left: Contest Info */}
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#ffdca1]" />
          <span className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em]">
            Secure Contest
          </span>
        </div>

        {/* Center: Timer & Progress */}
        <div className="flex-1 flex items-center gap-4 mx-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#ffdca1]" />
            <span className="text-[10px] text-[#d5c4ab]">15:42</span>
          </div>
          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-[#ffdca1] to-[#ffba20]" />
          </div>
        </div>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-[#9e8f78]">Participants:</span>
            <span className="text-[10px] font-bold text-[#ffdca1]">{players.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-[#9e8f78]">Solved:</span>
            <span className="text-[10px] font-bold text-emerald-400">
              {players.filter((p) => p.isSolved).length}
            </span>
          </div>

          {!isPractice && violationCount > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${
                violationCount >= 2
                  ? "bg-red-500/20 border-red-500 animate-pulse"
                  : "bg-amber-500/20 border-amber-500"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-300">
                {violationCount}/3
              </span>
            </div>
          )}

          {!isFullscreen && !isPractice && (
            <button
              onClick={enterFullscreen}
              title="Enter fullscreen"
              className="p-1.5 text-[#9e8f78] hover:text-[#ffdca1] hover:bg-white/10 rounded transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ── Violation Warning Modal ────────────────────── */}
      {!isPractice && (
        <ViolationWarningModal
          violation={showViolationModal ? lastViolation : null}
          violationCount={violationCount}
          maxViolations={3}
          onDismiss={() => setShowViolationModal(false)}
        />
      )}

      {/* ── Flagged Overlay ───────────────────────────── */}
      {isFlagged && <FlaggedBanner flagReason="Multiple contest violations detected" />}

      {/* ── Main Content ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Left Panel: Problem */}
        <div className="w-80 shrink-0 overflow-hidden">
          <ProblemPanel problem={problem} />
        </div>

        <ResizeDivider direction="vertical" onMouseDown={startResizeRight} />

        {/* Center Panel: Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="h-10 bg-[#1c1b1b] border-b border-white/5 flex items-center px-3 gap-2 shrink-0">
            <span className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em]">
              Editor
            </span>

            {/* Language Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ffdca1]/30 rounded text-[#d5c4ab] transition-colors disabled:opacity-40"
                disabled={battleFinished}
              >
                {currentLang.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-[#1c1b1b] border border-white/10 rounded shadow-lg z-50 min-w-[130px] overflow-hidden">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => handleLanguageChange(lang.value)}
                      className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                        language === lang.value
                          ? "bg-[#ffdca1]/15 text-[#ffdca1] font-semibold"
                          : "text-[#d5c4ab] hover:bg-white/5"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1" />

            {/* Action Buttons */}
            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting || battleFinished}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded transition-colors active:scale-95"
            >
              {isRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>
            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || battleFinished}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded transition-colors active:scale-95"
            >
              {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Submit
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              onMount={(ed) => {
                editorRef.current = ed;
              }}
              theme="cyber-arena"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                fontLigatures: true,
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoIndent: "full",
                formatOnPaste: true,
                formatOnType: false,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                renderWhitespace: "selection",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                tabSize: language === "python" ? 4 : 2,
                readOnly: battleFinished,
                contextmenu: false, // Disable context menu
              }}
              loading={
                <div className="w-full h-full bg-[#1c1b1b] flex items-center justify-center">
                  <div className="flex items-center gap-2 text-[#9e8f78] text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading editor…
                  </div>
                </div>
              }
            />
          </div>

          {/* Terminal */}
          <ResizeDivider onMouseDown={startResizeBottom} />
          <div style={{ height: bottomHeight }} className="overflow-hidden bg-[#131313] shrink-0">
            <TerminalPanel
              executionResult={executionResult}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>

        <ResizeDivider direction="vertical" onMouseDown={startResizeRight} />

        {/* Right Panel: Hint Bot */}
        <div style={{ width: rightPanelWidth }} className="shrink-0 overflow-hidden">
          <EasyBotPanel
            messages={aiMessages}
            isThinking={isThinking}
            draftMessage={draftMessage}
            setDraftMessage={setDraftMessage}
            onSend={handleSendChat}
            disabled={battleFinished}
            bottomRef={chatBottomRef}
          />
        </div>
      </div>

      {/* ── Status Bar ────────────────────────────────── */}
      <footer className="h-8 bg-gradient-to-r from-[#ffdca1] to-[#ffba20] border-t border-[#ffdca1]/20 flex items-center px-4 text-[10px] text-black font-bold uppercase tracking-wider shrink-0">
        <div className="flex items-center gap-4">
          <span>CodeWar Arena</span>
          <span>•</span>
          <span>{currentLang.label}</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <span>{players.filter((p) => p.isSolved).length}/{players.length} Solved</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
            Auto-saving
          </div>
        </div>
      </footer>

      {/* ── Results Modal ─────────────────────────────── */}
      {battleFinished && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1c1b1b] border border-[#ffdca1]/20 rounded-lg overflow-hidden shadow-2xl glow-primary">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ffdca1] to-[#ffba20] px-6 py-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-black" />
              <div>
                <h2 className="text-sm font-bold text-black uppercase tracking-wider font-['Space_Grotesk']">
                  {isFlagged ? "Submission Flagged" : "Battle Concluded"}
                </h2>
              </div>
            </div>

            {/* Scores */}
            <div className="p-4 space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded border transition-colors ${
                    p.id === user.id
                      ? "bg-[#ffdca1]/10 border-[#ffdca1]/20"
                      : "bg-white/[0.03] border-white/10"
                  }`}
                >
                  {p.isSolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="flex-1 text-sm text-[#e5e2e1] font-['Space_Grotesk']">
                    {p.username}
                    {p.id === user.id && <span className="text-[#9e8f78] ml-1">(you)</span>}
                  </span>
                  <span className="text-xs text-[#9e8f78]">
                    {Math.floor(p.progress)}% · {p.currentScore}pts
                  </span>
                </div>
              ))}
            </div>

            {isFlagged && (
              <div className="mx-4 mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded text-xs text-red-300">
                <p className="font-semibold mb-1">Violations Detected</p>
                <p>Your submission has been flagged for contest violations.</p>
              </div>
            )}

            <div className="px-4 pb-4">
              <button
                onClick={onExitBattle}
                className="w-full py-2.5 bg-[#ffdca1] hover:bg-[#ffba20] text-black font-bold text-sm rounded transition-colors font-['Space_Grotesk']"
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