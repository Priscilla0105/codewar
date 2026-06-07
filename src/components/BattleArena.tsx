/**
 * VSCODE-STYLE BATTLE ARENA
 * Complete rewrite — production-ready React + TypeScript + Tailwind
 *
 * Architecture:
 *   ActivityBar (left icon rail)
 *   → Sidebar (collapsible panel)
 *   → EditorGroup (problem + monaco)
 *     → ProblemTab
 *     → EditorTab
 *   → TerminalPanel (bottom, resizable)
 *   → EasyBotPanel (right sidebar)
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
  LayoutDashboard,
  Swords,
  DoorOpen,
  Trophy,
  UserCircle2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Send,
  Copy,
  Check,
  LogOut,
  Zap,
  Play,
  Upload,
  PanelBottom,
  PanelRight,
  X,
  MessageSquare,
  Lightbulb,
  Code2,
  RefreshCw,
  AlertTriangle,
  ChevronUp,
} from "lucide-react";
import { getSocket } from "../lib/socket";
import { User, Problem } from "../types";

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

type ActiveSidebarView =
  | "dashboard"
  | "battles"
  | "rooms"
  | "leaderboard"
  | "profile"
  | null;

type BottomPanelTab = "terminal" | "console" | "tests" | "debug";

type EditorTab = "problem" | "editor";

const LANGUAGES = [
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
];

const CODE_TEMPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your solution here\n    \n    return 0;\n}`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}`,
  java: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n    }\n}`,
  python: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Write your solution here\n    pass\n\nsolve()`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nlet idx = 0;\n\nfunction solve() {\n    // Write your solution here\n}\n\nsolve();`,
};

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Difficulty badge */
const DifficultyBadge = memo(({ difficulty }: { difficulty: string }) => {
  const map: Record<string, string> = {
    easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    hard: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  const cls = map[difficulty?.toLowerCase()] ?? map.medium;
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}
    >
      {difficulty}
    </span>
  );
});

/** Problem description panel */
const ProblemPanel = memo(({ problem }: { problem: Problem }) => (
  <div className="h-full overflow-y-auto px-5 py-4 space-y-4 text-sm leading-relaxed text-[#d4d4d4] font-[var(--vsc-font)]">
    <div className="flex items-start justify-between gap-3">
      <h1 className="text-base font-semibold text-white leading-tight">
        {problem?.title ?? "Loading problem…"}
      </h1>
      <DifficultyBadge difficulty={problem?.difficulty ?? "medium"} />
    </div>

    {problem?.tags?.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {problem.tags.map((tag: string) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400"
          >
            {tag}
          </span>
        ))}
      </div>
    )}

    <div
      className="prose prose-invert prose-sm max-w-none [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-amber-300 [&_code]:text-xs"
      dangerouslySetInnerHTML={{
        __html: problem?.description ?? "<p>Fetching problem statement…</p>",
      }}
    />

    {problem?.sampleInput && (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Sample Input
        </p>
        <pre className="bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
          {problem.sampleInput}
        </pre>
      </div>
    )}

    {problem?.sampleOutput && (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Sample Output
        </p>
        <pre className="bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap">
          {problem.sampleOutput}
        </pre>
      </div>
    )}

    {problem?.constraints && (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Constraints
        </p>
        <div className="bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-xs text-gray-300 space-y-0.5">
          {problem.constraints
  .filter(Boolean)
  .map((c: string, i: number) => (
    <p key={i} className="font-mono">
      {c}
    </p>
))}
        </div>
      </div>
    )}
  </div>
));

/** Timer display */
const TimerDisplay = memo(({ seconds }: { seconds: number }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = `${mins}:${secs.toString().padStart(2, "0")}`;
  const urgent = seconds <= 60;
  const warning = seconds <= 180 && seconds > 60;
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold tabular-nums
        ${urgent ? "text-red-400 bg-red-400/10 animate-pulse" : warning ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10"}`}
    >
      <Clock className="w-3.5 h-3.5" />
      {label}
    </div>
  );
});

/** Player progress bar */
const PlayerBar = memo(
  ({ player, isMe }: { player: PlayerProgress; isMe: boolean }) => (
    <div
      className={`px-3 py-2 rounded border text-xs ${isMe ? "border-amber-400/30 bg-amber-400/5" : "border-white/5 bg-white/[0.02]"}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`font-semibold truncate max-w-[80%] ${isMe ? "text-amber-400" : "text-gray-300"}`}
        >
          {player.username}
          {isMe && (
            <span className="text-gray-500 font-normal ml-1">(you)</span>
          )}
        </span>
        {player.isSolved && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}
      </div>
      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isMe ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-blue-600 to-blue-400"}`}
          style={{ width: `${Math.min(player.progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-gray-500">
        <span>{Math.floor(player.progress)}%</span>
        <span>
          {player.submissionCount} sub · {player.currentScore}pts
        </span>
      </div>
    </div>
  )
);

/** AI Bot chat */
const EasyBotPanel = memo(
  ({
    messages,
    isThinking,
    draftMessage,
    setDraftMessage,
    onSend,
    disabled,
    bottomRef,
    opponent,
  }: {
    messages: ChatMessage[];
    isThinking: boolean;
    draftMessage: string;
    setDraftMessage: (v: string) => void;
    onSend: (e: React.FormEvent) => void;
    disabled: boolean;
    bottomRef: React.RefObject<HTMLDivElement | null>;
    opponent: any;
  }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        {(
          [
            { icon: MessageSquare, label: "Chat" },
            { icon: Lightbulb, label: "Hints" },
          ] as const
        ).map(({ icon: Icon, label }, i) => (
          <button
            key={label}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
              i === 0
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Bot identity */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-amber-400/5 shrink-0">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-3 h-3 text-black" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-amber-400">
            {opponent?.username ?? "EasyBot"}
          </p>
          <p className="text-[10px] text-gray-500">AI Mentor · Online</p>
        </div>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
            <Sparkles className="w-6 h-6 opacity-40" />
            <p className="text-[11px] text-center leading-relaxed px-4">
              Your AI mentor is watching. Ask for hints or chat about your
              approach!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-1.5 ${msg.senderId === "user_self" ? "flex-row-reverse" : ""}`}
          >
            {msg.senderId !== "user_self" && (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-2.5 h-2.5 text-black" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed ${
                msg.senderId === "user_self"
                  ? "bg-blue-600/30 border border-blue-500/30 text-blue-100 ml-auto"
                  : "bg-white/[0.04] border border-white/10 text-gray-200"
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-1.5 items-center">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-black" />
            </div>
            <div className="bg-white/[0.04] border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={onSend}
        className="p-2 border-t border-white/5 flex gap-1.5 shrink-0"
      >
        <input
          type="text"
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          placeholder="Ask EasyBot…"
          disabled={disabled}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-400/50 disabled:opacity-40 transition-colors"
        />
        <button
          type="submit"
          disabled={disabled || !draftMessage.trim()}
          className="p-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded transition-colors"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  )
);

/** Terminal / bottom panel */
const TerminalPanel = memo(
  ({
    activeTab,
    setActiveTab,
    executionResult,
    isRunning,
    isSubmitting,
  }: {
    activeTab: BottomPanelTab;
    setActiveTab: (t: BottomPanelTab) => void;
    executionResult: ExecutionResult | null;
    isRunning: boolean;
    isSubmitting: boolean;
  }) => {
    const tabs: { id: BottomPanelTab; label: string }[] = [
      { id: "terminal", label: "Terminal" },
      { id: "console", label: "Output" },
      { id: "tests", label: "Test Results" },
      { id: "debug", label: "Debug" },
    ];
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-white/5 bg-[#252526] shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 text-[11px] font-medium border-t-2 transition-colors ${
                activeTab === t.id
                  ? "border-amber-400 text-amber-400 bg-[#1e1e1e]"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
              {t.id === "tests" &&
                executionResult?.testsPassed !== undefined && (
                  <span
                    className={`ml-1.5 text-[10px] px-1 rounded ${
                      executionResult.success
                        ? "bg-emerald-400/20 text-emerald-400"
                        : "bg-red-400/20 text-red-400"
                    }`}
                  >
                    {executionResult.testsPassed}/{executionResult.totalTests}
                  </span>
                )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-[#1e1e1e] min-h-0">
          {(isRunning || isSubmitting) && (
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{isRunning ? "Running code…" : "Submitting…"}</span>
            </div>
          )}

          {activeTab === "terminal" && !executionResult && !isRunning && (
            <div className="text-gray-600 space-y-0.5">
              <p>
                <span className="text-emerald-400">~</span> Welcome to
                CodeWar Terminal
              </p>
              <p>
                <span className="text-emerald-400">~</span> Press{" "}
                <span className="text-amber-400">▶ Run</span> to execute your
                code
              </p>
              <p>
                <span className="text-emerald-400">~</span>{" "}
                <span className="animate-pulse">█</span>
              </p>
            </div>
          )}

          {executionResult && (activeTab === "terminal" || activeTab === "console") && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {executionResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span
                  className={`font-bold ${executionResult.success ? "text-emerald-400" : "text-red-400"}`}
                >
                  {executionResult.success ? "Accepted" : "Failed"}
                </span>
                <span className="text-gray-500 text-[10px]">
                  · {executionResult.executionTime}ms
                </span>
              </div>

              {executionResult.output && (
                <div>
                  <p className="text-gray-500 text-[10px] mb-1">STDOUT</p>
                  <pre className="text-gray-300 whitespace-pre-wrap break-words">
                    {executionResult.output}
                  </pre>
                </div>
              )}

              {executionResult.error && (
                <div className="mt-2">
                  <p className="text-red-500 text-[10px] mb-1">STDERR</p>
                  <pre className="text-red-400 whitespace-pre-wrap break-words">
                    {executionResult.error}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === "tests" && (
            <div className="space-y-2">
              {!executionResult ? (
                <p className="text-gray-600">
                  Submit your code to see test results.
                </p>
              ) : (
                <>
                  {executionResult.testsPassed !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Test cases</span>
                        <span
                          className={`font-bold ${
                            executionResult.testsPassed ===
                            executionResult.totalTests
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {executionResult.testsPassed}/
                          {executionResult.totalTests}
                        </span>
                      </div>
                      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            executionResult.success
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${((executionResult.testsPassed ?? 0) / (executionResult.totalTests ?? 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-gray-500 text-[10px] mt-2">
                    Verdict: {executionResult.output || "—"}
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === "debug" && (
            <p className="text-gray-600">Debug logs will appear here.</p>
          )}
        </div>
      </div>
    );
  }
);

/** Activity bar icon button */
const ActivityBarBtn = memo(
  ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group relative flex items-center justify-center w-12 h-12 transition-colors ${
        active
          ? "text-white border-l-2 border-amber-400"
          : "text-gray-500 hover:text-gray-300 border-l-2 border-transparent"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="pointer-events-none absolute left-14 z-50 hidden group-hover:block bg-[#3a3d41] text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-xl">
        {label}
      </span>
    </button>
  )
);

/** Resizable divider */
const ResizeDivider = memo(
  ({
    onMouseDown,
    direction = "horizontal",
  }: {
    onMouseDown: (e: React.MouseEvent) => void;
    direction?: "horizontal" | "vertical";
  }) =>
    direction === "vertical" ? (
      <div
        onMouseDown={onMouseDown}
        className="w-1 bg-transparent hover:bg-amber-400/40 cursor-col-resize transition-colors shrink-0"
        style={{ zIndex: 10 }}
      />
    ) : (
      <div
        onMouseDown={onMouseDown}
        className="h-1 bg-transparent hover:bg-amber-400/40 cursor-row-resize transition-colors shrink-0"
        style={{ zIndex: 10 }}
      />
    )
);

/** VS Code tab */
const VSTab = memo(
  ({
    label,
    icon: Icon,
    active,
    onClick,
    onClose,
    modified,
  }: {
    label: string;
    icon?: React.ElementType;
    active: boolean;
    onClick: () => void;
    onClose?: () => void;
    modified?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1.5 px-4 py-1.5 text-[12px] border-r border-white/5 shrink-0 transition-colors ${
        active
          ? "bg-[#1e1e1e] text-white border-t-2 border-t-amber-400"
          : "bg-[#2d2d2d] text-gray-400 hover:text-gray-200 border-t-2 border-t-transparent"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
      {label}
      {modified && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />
      )}
      {onClose && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => e.key === "Enter" && onClose()}
          className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 ml-1 transition-opacity"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  )
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Battle({
  user,
  roomId,
  problem,
  initialPlayers,
  isAiGame,
  isPractice,
  onExitBattle,
}: BattleProps) {
  const socket = getSocket();

  // ── Editor state
  const [code, setCode] = useState<string>(() => {
    const saved = localStorage.getItem(`cw_code_cpp`);
    return saved ?? CODE_TEMPLATES.cpp;
  });
  const [language, setLanguage] = useState<string>("cpp");
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);

  // ── Battle state
  const [players, setPlayers] = useState<PlayerProgress[]>(initialPlayers);
  const [opponent, setOpponent] = useState<any>(null);
  const [timer, setTimer] = useState(1800); // 30 minutes default
  const [battleFinished, setBattleFinished] = useState(false);
  const [winnerSummary, setWinnerSummary] = useState<any>(null);

  // ── Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);

  // ── Chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Layout state
  const [activeSidebar, setActiveSidebar] =
    useState<ActiveSidebarView>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [rightPanelWidth, setRightPanelWidth] = useState(260);
  const [bottomHeight, setBottomHeight] = useState(180);
  const [bottomPanelTab, setBottomPanelTab] =
    useState<BottomPanelTab>("terminal");
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>("problem");
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // ── Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, isThinking]);

  // ── Auto-save code
  useEffect(() => {
    const id = setInterval(() => {
      if (code) localStorage.setItem(`cw_code_${language}`, code);
    }, 3000);
    return () => clearInterval(id);
  }, [code, language]);

  // ── Timer
  useEffect(() => {
    if (battleFinished) return;
    if (timer <= 0) {
      handleBattleEnd();
      return;
    }
    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleBattleEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleFinished]);

  // ── Socket listeners
  useEffect(() => {
    socket?.on("player-progress-update", (data: PlayerProgress) => {
      setPlayers((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      if (data.isSolved && data.id !== user.id) {
        addBotMessage("Opponent just solved it! Time to push harder 💪");
      }
    });
    socket?.on("battle-ended", (data: any) => {
      setWinnerSummary(data);
      setBattleFinished(true);
    });
    return () => {
      socket?.off("player-progress-update");
      socket?.off("battle-ended");
    };
  }, [socket, user.id]);

  // ── Init opponent
  useEffect(() => {
    if (!opponent && initialPlayers.length > 1) {
      const opp = initialPlayers.find((p) => p.id !== user.id);
      if (opp) {
        setOpponent(opp);
        addBotMessage(
          `Hey! I'm watching your progress. Ask me anything if you get stuck! 🚀`
        );
      }
    }
  }, [initialPlayers, user.id]);

  // ── Language change
  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      setShowLanguagePicker(false);
      const saved = localStorage.getItem(`cw_code_${lang}`);
      setCode(saved ?? CODE_TEMPLATES[lang] ?? "");
    },
    []
  );

  // ── Helpers
  const addBotMessage = useCallback((message: string) => {
    setAiMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_${Math.random()}`,
        senderId: "bot",
        senderName: "EasyBot",
        message,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleBattleEnd = useCallback(() => {
    setBattleFinished(true);
    socket?.emit("battle-end", { roomId, userId: user.id, players });
  }, [roomId, user.id, players, socket]);

  // ── Run code
  const handleRunCode = useCallback(async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setExecutionResult(null);
    setBottomPanelTab("terminal");
    setShowBottomPanel(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          input: problem?.sampleInput,
          problemId: problem?._id,
        }),
      });
      const result = await res.json();
      setExecutionResult({
        success: result.success,
        output: result.output ?? "",
        error: result.error,
        executionTime: result.executionTime ?? 0,
      });
      addBotMessage(
        result.success
          ? "Code ran! Now test all edge cases before submitting 🧪"
          : "There's an error — check STDERR in the terminal below 🐛"
      );
    } catch (err) {
      setExecutionResult({
        success: false,
        output: "",
        error: `Execution failed: ${String(err)}`,
        executionTime: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, language, problem, addBotMessage]);

  // ── Submit code
  const handleSubmitCode = useCallback(async () => {
    if (!code.trim()) return;
    setIsSubmitting(true);
    setExecutionResult(null);
    setBottomPanelTab("tests");
    setShowBottomPanel(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          code,
          language,
          problemId: problem?._id,
          roomId,
        }),
      });
      const result = await res.json();
      const solved = result.verdict === "Accepted";
      const progress =
        solved
          ? 100
          : ((result.testsPassed ?? 0) / (result.totalTests ?? 1)) * 100;

      setExecutionResult({
        success: solved,
        output: result.verdict,
        error: result.error,
        executionTime: result.executionTime ?? 0,
        testsPassed: result.testsPassed,
        totalTests: result.totalTests,
      });

      const me = players.find((p) => p.id === user.id);
      const updatedPlayer: PlayerProgress = {
        id: user.id,
        username: user.username,
        progress,
        submissionCount: (me?.submissionCount ?? 0) + 1,
        currentScore: (me?.currentScore ?? 0) + (solved ? 100 : 0),
        isSolved: solved,
      };

      socket?.emit("player-progress", updatedPlayer);
      socket?.emit("code-submitted", {
        userId: user.id,
        username: user.username,
        verdict: result.verdict,
        testsPassed: result.testsPassed,
        totalTests: result.totalTests,
      });
      setPlayers((prev) =>
        prev.map((p) => (p.id === user.id ? updatedPlayer : p))
      );

      addBotMessage(
        solved
          ? "🎉 ACCEPTED! You crushed it! Perfect submission!"
          : `${result.testsPassed ?? 0}/${result.totalTests ?? "?"} tests passed. Let's debug 🔍`
      );
    } catch (err) {
      setExecutionResult({
        success: false,
        output: "",
        error: `Submission failed: ${String(err)}`,
        executionTime: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [code, language, problem, roomId, players, user, socket, addBotMessage]);

  // ── Chat send
  const handleSendChat = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const msg = draftMessage.trim();
      if (!msg) return;
      setAiMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          senderId: "user_self",
          senderName: "You",
          message: msg,
          timestamp: new Date().toISOString(),
        },
      ]);
      setDraftMessage("");
      setIsThinking(true);
      const botReplies = [
        "Think about the time complexity — can you do better than O(n²)? 🤔",
        "Check your base cases first! Edge inputs break many solutions 🎯",
        "Good thinking! Try tracing through the sample input manually 📝",
        "Have you considered using a hash map for O(1) lookup? 💡",
        "That approach looks promising! Now handle the edge cases 🔍",
      ];
      setTimeout(() => {
        addBotMessage(
          botReplies[Math.floor(Math.random() * botReplies.length)]
        );
        setIsThinking(false);
      }, 1000 + Math.random() * 800);
    },
    [draftMessage, addBotMessage]
  );

  // ── Resize handlers (sidebar, right panel, bottom panel)
  const startResizeSidebar = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        setSidebarWidth(
          Math.min(380, Math.max(160, startW + ev.clientX - startX))
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth]
  );

  const startResizeRight = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = rightPanelWidth;
      const onMove = (ev: MouseEvent) => {
        setRightPanelWidth(
          Math.min(420, Math.max(200, startW - (ev.clientX - startX)))
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [rightPanelWidth]
  );

  const startResizeBottom = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = bottomHeight;
      const onMove = (ev: MouseEvent) => {
        setBottomHeight(
          Math.min(400, Math.max(80, startH - (ev.clientY - startY)))
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [bottomHeight]
  );

  // ── Sidebar toggle
  const toggleSidebar = useCallback(
    (view: ActiveSidebarView) => {
      setActiveSidebar((prev) => (prev === view ? null : view));
    },
    []
  );

  const currentLangLabel =
    LANGUAGES.find((l) => l.value === language)?.label ?? "C++";

  // ── Sidebar content
  const renderSidebarContent = () => {
    if (!activeSidebar) return null;
    const headings: Record<string, string> = {
      dashboard: "Dashboard",
      battles: "Battle Progress",
      rooms: "Rooms",
      leaderboard: "Leaderboard",
      profile: "Profile",
    };
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b border-white/5 shrink-0">
          {headings[activeSidebar]}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
          {activeSidebar === "battles" &&
            players.map((p) => (
              <PlayerBar key={p.id} player={p} isMe={p.id === user.id} />
            ))}
          {activeSidebar === "dashboard" && (
            <div className="space-y-2 pt-1">
              <div className="px-3 py-2 rounded bg-white/[0.03] border border-white/5 text-xs text-gray-400">
                <p className="text-gray-200 font-medium mb-0.5">
                  {user.username}
                </p>
                <p>Room: {roomId}</p>
                <p>{isPractice ? "Practice mode" : "Battle mode"}</p>
              </div>
            </div>
          )}
          {activeSidebar === "leaderboard" && (
            <div className="space-y-1.5 pt-1">
              {[...players]
                .sort((a, b) => b.currentScore - a.currentScore)
                .map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/[0.02] text-xs"
                  >
                    <span className="text-gray-500 w-4">{i + 1}</span>
                    <span
                      className={`flex-1 ${p.id === user.id ? "text-amber-400" : "text-gray-300"}`}
                    >
                      {p.username}
                    </span>
                    <span className="text-gray-500">{p.currentScore}pts</span>
                  </div>
                ))}
            </div>
          )}
          {(activeSidebar === "rooms" || activeSidebar === "profile") && (
            <p className="text-xs text-gray-600 px-2 pt-2">
              Navigate to this section from the dashboard.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-full h-screen bg-[#1e1e1e] text-[#d4d4d4] flex flex-col overflow-hidden"
      style={{ fontFamily: "'Menlo', 'Consolas', monospace" }}
    >
      {/* ── Title bar ─────────────────────────────────────────── */}
      <div className="h-8 bg-[#3c3c3c] flex items-center justify-between px-4 shrink-0 select-none">
        {/* Left: menu-like items */}
        <div className="flex items-center gap-4">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          {["File", "Edit", "View", "Run"].map((m) => (
            <span
              key={m}
              className="text-[11px] text-gray-300 hover:text-white cursor-pointer transition-colors"
            >
              {m}
            </span>
          ))}
        </div>

        {/* Center: filename */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-mono">
            {problem?.title
              ? `${problem.title}.${language}`
              : "battle-arena"}{" "}
            — CodeWar
          </span>
        </div>

        {/* Right: timer + exit */}
        <div className="flex items-center gap-2">
          <TimerDisplay seconds={timer} />
          <button
            onClick={onExitBattle}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-400/10 rounded transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Exit
          </button>
        </div>
      </div>

      {/* ── Main body ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-1 shrink-0 border-r border-black/30">
          <ActivityBarBtn
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeSidebar === "dashboard"}
            onClick={() => toggleSidebar("dashboard")}
          />
          <ActivityBarBtn
            icon={Swords}
            label="Battle Progress"
            active={activeSidebar === "battles"}
            onClick={() => toggleSidebar("battles")}
          />
          <ActivityBarBtn
            icon={DoorOpen}
            label="Rooms"
            active={activeSidebar === "rooms"}
            onClick={() => toggleSidebar("rooms")}
          />
          <ActivityBarBtn
            icon={Trophy}
            label="Leaderboard"
            active={activeSidebar === "leaderboard"}
            onClick={() => toggleSidebar("leaderboard")}
          />

          {/* Bottom pinned */}
          <div className="mt-auto">
            <ActivityBarBtn
              icon={UserCircle2}
              label="Profile"
              active={activeSidebar === "profile"}
              onClick={() => toggleSidebar("profile")}
            />
          </div>
        </div>

        {/* Sidebar */}
        {activeSidebar && (
          <>
            <div
              style={{ width: sidebarWidth }}
              className="bg-[#252526] border-r border-black/40 flex flex-col shrink-0 overflow-hidden"
            >
              {renderSidebarContent()}
            </div>
            <ResizeDivider
              onMouseDown={startResizeSidebar}
              direction="vertical"
            />
          </>
        )}

        {/* Editor group + bottom panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tab bar */}
          <div className="flex items-center bg-[#252526] border-b border-black/30 overflow-x-auto shrink-0 scrollbar-none">
            <VSTab
              label={problem?.title ?? "Problem"}
              icon={Code2}
              active={activeEditorTab === "problem"}
              onClick={() => setActiveEditorTab("problem")}
            />
            <VSTab
              label={`solution.${language}`}
              icon={Code2}
              active={activeEditorTab === "editor"}
              onClick={() => setActiveEditorTab("editor")}
              modified={!!code && code !== (CODE_TEMPLATES[language] ?? "")}
            />

            {/* Right-aligned controls */}
            <div className="ml-auto flex items-center gap-1 px-2 shrink-0">
              <button
                title="Toggle terminal"
                onClick={() => setShowBottomPanel((v) => !v)}
                className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              >
                <PanelBottom className="w-3.5 h-3.5" />
              </button>
              <button
                title="Toggle EasyBot"
                onClick={() => setShowRightPanel((v) => !v)}
                className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Editor area + right panel */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Main editor/problem pane */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Problem or Editor */}
              <div className="flex-1 overflow-hidden min-h-0">
                {activeEditorTab === "problem" ? (
                  <ProblemPanel problem={problem} />
                ) : (
                  <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
                    {/* Editor toolbar */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-black/30 shrink-0">
                      {/* Language picker */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowLanguagePicker((v) => !v)
                          }
                          className="flex items-center gap-1 px-2 py-1 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors text-gray-300"
                        >
                          {currentLangLabel}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {showLanguagePicker && (
                          <div className="absolute top-full left-0 mt-1 bg-[#252526] border border-white/10 rounded shadow-2xl z-50 min-w-[120px]">
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang.value}
                                onClick={() =>
                                  handleLanguageChange(lang.value)
                                }
                                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                                  language === lang.value
                                    ? "bg-amber-400/15 text-amber-400"
                                    : "text-gray-300 hover:bg-white/5"
                                }`}
                              >
                                {lang.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-1" />

                      <button
                        onClick={handleCopy}
                        title="Copy code"
                        className="p-1 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Run & Submit */}
                      <button
                        onClick={handleRunCode}
                        disabled={isRunning || isSubmitting || battleFinished}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
                      >
                        {isRunning ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        Run
                      </button>
                      <button
                        onClick={handleSubmitCode}
                        disabled={isRunning || isSubmitting || battleFinished}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        Submit
                      </button>
                    </div>

                    {/* Monaco */}
                    <div className="flex-1 min-h-0">
                      <Editor
                        height="100%"
                        language={language}
                        value={code}
                        onChange={(v) => setCode(v ?? "")}
                        onMount={(ed) => {
                          editorRef.current = ed;
                        }}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: true },
                          fontSize: 13,
                          fontFamily: "'Menlo', 'Fira Code', monospace",
                          fontLigatures: true,
                          lineNumbers: "on",
                          lineNumbersMinChars: 3,
                          bracketPairColorization: { enabled: true },
                          autoClosingBrackets: "always",
                          autoClosingQuotes: "always",
                          autoIndent: "full",
                          formatOnPaste: true,
                          formatOnType: true,
                          wordWrap: "on",
                          scrollBeyondLastLine: false,
                          renderWhitespace: "selection",
                          cursorBlinking: "smooth",
                          smoothScrolling: true,
                          padding: { top: 12, bottom: 12 },
                          suggestOnTriggerCharacters: true,
                          quickSuggestions: true,
                          contextmenu: true,
                          readOnly: battleFinished,
                        }}
                        loading={
                          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Loading editor…
                            </div>
                          </div>
                        }
                      />
                    </div>

                    {/* Status bar (like VS Code) */}
                    <div className="flex items-center justify-between px-3 py-0.5 bg-amber-400 text-black text-[10px] shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">⚡ CodeWar</span>
                        <span>{currentLangLabel}</span>
                        {battleFinished && (
                          <span className="bg-black/20 px-1.5 rounded">
                            READ-ONLY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
                          Auto-saving
                        </div>
                        <span>UTF-8</span>
                        <span>LF</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom terminal panel */}
              {showBottomPanel && (
                <>
                  <ResizeDivider onMouseDown={startResizeBottom} />
                  <div
                    style={{ height: bottomHeight }}
                    className="bg-[#1e1e1e] border-t border-black/40 shrink-0 overflow-hidden flex flex-col"
                  >
                    <TerminalPanel
                      activeTab={bottomPanelTab}
                      setActiveTab={setBottomPanelTab}
                      executionResult={executionResult}
                      isRunning={isRunning}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right panel — EasyBot */}
            {showRightPanel && (
              <>
                <ResizeDivider
                  onMouseDown={startResizeRight}
                  direction="vertical"
                />
                <div
                  style={{ width: rightPanelWidth }}
                  className="bg-[#252526] border-l border-black/40 flex flex-col overflow-hidden shrink-0"
                >
                  <EasyBotPanel
                    messages={aiMessages}
                    isThinking={isThinking}
                    draftMessage={draftMessage}
                    setDraftMessage={setDraftMessage}
                    onSend={handleSendChat}
                    disabled={battleFinished}
                    bottomRef={chatBottomRef}
                    opponent={opponent}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── VS Code bottom status bar ─────────────────────────── */}
      <div className="h-5 bg-[#007acc] flex items-center justify-between px-3 text-[10px] text-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            CodeWar Arena
          </span>
          <span>Room: {roomId}</span>
          {battleFinished && (
            <span className="flex items-center gap-1 text-yellow-300">
              <AlertTriangle className="w-3 h-3" />
              Battle Ended
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>{players.filter((p) => p.isSolved).length}/{players.length} solved</span>
          <span>{currentLangLabel}</span>
        </div>
      </div>

      {/* ── Results modal ─────────────────────────────────────── */}
      {battleFinished && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Battle results"
        >
          <div className="w-full max-w-md bg-[#252526] border border-amber-400/30 rounded-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-amber-400 px-6 py-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-black" />
              <div>
                <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                  Battle Concluded
                </h2>
                {winnerSummary?.winnerName && (
                  <p className="text-xs text-black/70">
                    Winner: {winnerSummary.winnerName}
                  </p>
                )}
              </div>
            </div>

            {/* Scores */}
            <div className="p-4 space-y-2">
              {(winnerSummary?.players ?? players).map((p: any) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded ${
                    p.id === user.id
                      ? "bg-amber-400/10 border border-amber-400/20"
                      : "bg-white/[0.03] border border-white/5"
                  }`}
                >
                  {p.isSolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="flex-1 text-sm text-gray-200">
                    {p.username}
                    {p.id === user.id && (
                      <span className="text-gray-500 ml-1">(you)</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">
                    {Math.floor(p.progress)}% · {p.currentScore}pts
                  </span>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={onExitBattle}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm rounded transition-colors"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}