/**
 * CYBER ARENA - BATTLE ARENA
 * Refactored with complete Cyber Arena design system
 *
 * Design System:
 *   - Color Palette: Deep black (#131313), Orange primary (#ffdca1), Neon Green (#27ff97), Cyber Red (#ffb1ab)
 *   - Typography: Space Grotesk (UI), JetBrains Mono (code)
 *   - Layout: 3-pane fixed grid (320px left, fluid center, 280px right)
 *   - Elevation: Tonal layering with luminous borders
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
              className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#d5c4ab] font-['Space_Grotesk']"
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
          <pre className="bg-[#1c1b1b] border border-white/10 rounded px-3 py-2 text-xs font-['JetBrains_Mono'] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
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
          <pre className="bg-[#1c1b1b] border border-white/10 rounded px-3 py-2 text-xs font-['JetBrains_Mono'] text-blue-300 overflow-x-auto whitespace-pre-wrap">
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
          <div className="bg-[#1c1b1b] border border-white/10 rounded px-3 py-2 text-xs text-[#d5c4ab] space-y-1 font-['JetBrains_Mono']">
            {problem.constraints.map((c: string, i: number) => (
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 font-['JetBrains_Mono'] text-xs">
        {isRunning || isSubmitting ? (
          <div className="flex items-center gap-2 text-[#d5c4ab]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ffdca1]" />
            {isRunning ? "Running…" : "Submitting…"}
          </div>
        ) : executionResult ? (
          <div className="space-y-2">
            <div
              className={`flex items-center gap-2 ${
                executionResult.success ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {executionResult.success ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="font-bold">
                {executionResult.success ? "SUCCESS" : "FAILED"}
              </span>
            </div>
            {executionResult.output && (
              <pre className="text-[#d5c4ab] whitespace-pre-wrap break-words">
                {executionResult.output}
              </pre>
            )}
            {executionResult.error && (
              <pre className="text-red-300 whitespace-pre-wrap break-words">
                {executionResult.error}
              </pre>
            )}
            <div className="text-[#9e8f78] text-[10px]">
              Execution Time: {executionResult.executionTime}ms
            </div>
          </div>
        ) : (
          <div className="text-[#514532]">Ready to execute…</div>
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
    opponent,
  }: {
    messages: ChatMessage[];
    isThinking: boolean;
    draftMessage: string;
    setDraftMessage: (msg: string) => void;
    onSend: () => void;
    disabled: boolean;
    bottomRef: React.RefObject<HTMLDivElement>;
    opponent?: PlayerProgress;
  }) => (
    <div className="h-full flex flex-col bg-[#131313] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-[#1c1b1b] shrink-0">
        <p className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em] font-['Space_Grotesk']">
          Hint Bot
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-0.5">
            <p className="text-[10px] font-bold text-[#ffdca1] font-['Space_Grotesk']">
              {msg.senderName}
            </p>
            <p className="text-xs text-[#d5c4ab] font-['JetBrains_Mono'] leading-relaxed">
              {msg.message}
            </p>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-[#ffdca1]">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="text-xs font-['JetBrains_Mono']">Thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-white/5 bg-[#1c1b1b] shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled) onSend();
            }}
            disabled={disabled}
            placeholder="Ask a hint…"
            className="flex-1 bg-[#201f1f] border border-white/10 rounded px-2 py-1.5 text-xs font-['JetBrains_Mono'] text-[#e5e2e1] placeholder-[#514532] focus:outline-none focus:border-[#ffdca1]/50 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={disabled || !draftMessage.trim()}
            className="p-1.5 bg-[#ffdca1] hover:bg-[#ffba20] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
);

const ResizeDivider = memo(
  ({
    onMouseDown,
    direction = "horizontal",
  }: {
    onMouseDown: (e: React.MouseEvent) => void;
    direction?: "horizontal" | "vertical";
  }) => (
    <div
      onMouseDown={onMouseDown}
      className={`${
        direction === "horizontal"
          ? "h-1 cursor-row-resize hover:bg-[#ffdca1]/20"
          : "w-1 cursor-col-resize hover:bg-[#ffdca1]/20"
      } bg-white/5 transition-colors shrink-0`}
    />
  )
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BattleArena({
  user,
  roomId,
  problem,
  initialPlayers,
  isAiGame,
  isPractice,
  onExitBattle,
}: BattleProps) {
  const [code, setCode] = useState(() => CODE_TEMPLATES.cpp);
  const [language, setLanguage] = useState("cpp");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [players, setPlayers] = useState<PlayerProgress[]>(initialPlayers);
  const [battleFinished, setBattleFinished] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(250);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const editorRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null!);

  const currentLang = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];

  // ── Socket connections
  useEffect(() => {
    const socket = getSocket();
    socket.on("execution_result", (result: ExecutionResult) => {
      setExecutionResult(result);
      setIsRunning(false);
    });
    socket.on("battle_finished", () => setBattleFinished(true));
    socket.on("player_update", (updatedPlayers: PlayerProgress[]) => {
      setPlayers(updatedPlayers);
    });
    socket.on("ai_message", (msg: ChatMessage) => {
      setAiMessages((prev) => [...prev, msg]);
      setIsThinking(false);
    });
    return () => {
      socket.off("execution_result");
      socket.off("battle_finished");
      socket.off("player_update");
      socket.off("ai_message");
    };
  }, []);

  // ── Close dropdown on outside click
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

  // ── Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setCode(CODE_TEMPLATES[lang] ?? CODE_TEMPLATES.cpp);
    setShowDropdown(false);
  }, []);

  const handleRunCode = useCallback(() => {
    setIsRunning(true);
    const socket = getSocket();
    socket.emit("run_code", {
      roomId,
      code,
      language,
      problemId: problem.id,
    });
  }, [code, language, roomId, problem.id]);

  const handleSubmitCode = useCallback(() => {
    setIsSubmitting(true);
    const socket = getSocket();
    socket.emit("submit_code", {
      roomId,
      code,
      language,
      problemId: problem.id,
    });
  }, [code, language, roomId, problem.id]);

  const handleSendChat = useCallback(() => {
    if (!draftMessage.trim()) return;
    setIsThinking(true);
    const socket = getSocket();
    socket.emit("ask_hint", {
      roomId,
      message: draftMessage,
    });
    setDraftMessage("");
  }, [draftMessage, roomId]);

  const startResizeBottom = useCallback((e: React.MouseEvent) => {
    const start = e.clientY;
    const startHeight = bottomHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = start - moveEvent.clientY;
      setBottomHeight(Math.max(150, startHeight + delta));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [bottomHeight]);

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    const start = e.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - start;
      setRightPanelWidth(Math.max(200, startWidth - delta));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [rightPanelWidth]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#131313] overflow-hidden font-['Space_Grotesk']">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="h-12 bg-[#1c1b1b] border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#ffdca1]" />
          <span className="text-xs font-bold text-[#ffdca1] uppercase tracking-[0.08em]">
            CodeWar Arena
          </span>
        </div>
        <span className="text-[10px] text-[#9e8f78]">Room: {roomId}</span>
        <div className="flex-1" />
        {battleFinished && (
          <span className="flex items-center gap-1 text-[10px] text-red-300 font-bold uppercase">
            <AlertTriangle className="w-3 h-3" />
            Battle Ended
          </span>
        )}
      </header>

      {/* ── Main Layout ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Left Panel */}
        <div className="w-80 shrink-0 overflow-hidden">
          <ProblemPanel problem={problem} />
        </div>

        <ResizeDivider direction="vertical" onMouseDown={startResizeRight} />

        {/* Center Panel */}
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
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded transition-colors"
            >
              {isRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>
            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || battleFinished}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded transition-colors"
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
              theme="vs-dark"
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

        {/* Right Panel */}
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

      {/* ── Status Bar ─────────────────────────────────── */}
      <footer className="h-8 bg-[#ffdca1] border-t border-white/10 flex items-center px-4 text-[10px] text-black font-bold uppercase tracking-wider shrink-0">
        <div className="flex items-center gap-4">
          <span>CodeWar</span>
          <span>{currentLang.label}</span>
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
          <div className="w-full max-w-md bg-[#1c1b1b] border border-[#ffdca1]/20 rounded-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-[#ffdca1] px-6 py-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-black" />
              <div>
                <h2 className="text-sm font-bold text-black uppercase tracking-wider font-['Space_Grotesk']">
                  Battle Concluded
                </h2>
              </div>
            </div>

            {/* Scores */}
            <div className="p-4 space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded border ${
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
}