import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import Editor from "@monaco-editor/react";
import {
  Trophy, CheckCircle2, XCircle, AlertTriangle, Send, Copy, Check, Play, Upload, RefreshCw,
  ChevronDown, Zap, MessageSquare, Code2, Clock, X, AlertCircle, Shield, Eye,
} from "lucide-react";
import { getSocket } from "../lib/socket";
import { User, Problem } from "../types";
import { useSecureContest, type Violation } from "../hooks/useSecureContest";

interface BattleProps {
  user: User;
  roomId: string;
  problem: Problem;
  initialPlayers: any[];
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

const LANGUAGES = [
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
];

const CODE_TEMPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    return 0;\n}`,
  java: `import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}`,
  python: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    pass\n\nsolve()`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n');\nlet idx = 0;\nfunction solve() {}\nsolve();`,
};

const ViolationWarningModal = memo(
  ({ violation, violationCount, maxViolations, onDismiss }: any) => {
    if (!violation) return null;
    const isCritical = violationCount >= maxViolations - 1;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} />
        <div
          className={`relative w-full max-w-sm rounded-lg border-2 p-4 shadow-2xl ${
            isCritical ? "bg-[#ff6b6b]/20 border-[#ff6b6b]" : "bg-[#111111] border-[#FFC107]/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isCritical ? "text-[#ff6b6b]" : "text-[#FFC107]"}`} />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white mb-1">
                {isCritical ? "Critical Violation" : "Contest Violation Detected"}
              </h3>
              <p className="text-xs text-[#F5F5F5] mb-3">{violation.details}</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isCritical ? "bg-[#ff6b6b]" : "bg-[#FFC107]"}`}
                    style={{ width: `${(violationCount / maxViolations) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold">{violationCount}/{maxViolations}</span>
              </div>
              {isCritical && <p className="text-xs text-[#ff6b6b] font-semibold mb-3">One more violation will flag your submission!</p>}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-full mt-3 px-4 py-2 bg-[#2e2e2e] hover:bg-[#383838] rounded text-xs font-bold text-white transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  }
);

const FlaggedBanner = memo(({ flagReason }: { flagReason?: string }) => (
  <div className="absolute inset-0 z-[200] bg-[#ff6b6b]/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
    <div className="bg-[#ff6b6b]/30 border-2 border-[#ff6b6b] rounded-lg p-6 text-center max-w-md">
      <AlertTriangle className="w-8 h-8 text-[#ff6b6b] mx-auto mb-3" />
      <h2 className="text-lg font-bold text-white mb-2">Submission Flagged</h2>
      <p className="text-sm text-white mb-4">{flagReason || "Your submission has been flagged for contest violations."}</p>
      <p className="text-xs text-[#F5F5F5]">This incident has been logged and reported to administrators.</p>
    </div>
  </div>
));

const DifficultyBadge = memo(({ difficulty }: { difficulty: string }) => {
  const colorMap: Record<string, string> = {
    easy: "bg-[#00cc44]/20 text-[#00cc44] border-[#00cc44]/30",
    medium: "bg-[#FFC107]/20 text-[#FFC107] border-[#FFC107]/30",
    hard: "bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded border ${colorMap[difficulty?.toLowerCase()] || colorMap.medium}`}>
      {difficulty}
    </span>
  );
});

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

  const [code, setCode] = useState(CODE_TEMPLATES.cpp);
  const [language, setLanguage] = useState("cpp");
  const [showDropdown, setShowDropdown] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [players, setPlayers] = useState(initialPlayers);
  const [battleFinished, setBattleFinished] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [lastViolation, setLastViolation] = useState<Violation | null>(null);
  const [problemVisible, setProblemVisible] = useState(true);

  const { violations, violationCount, isFlagged, isFullscreen, enterFullscreen, logViolation } = useSecureContest({
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
      if (socket) socket.emit(event, { roomId, userId: user.id, ...data });
    },
  });

  const currentLang = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];

  // Auto-fullscreen when battle starts
  useEffect(() => {
    if (!isPractice && !isFlagged && containerRef.current) {
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPractice, isFlagged, enterFullscreen]);

  const [timeLeft, setTimeLeft] = useState(300); // 5 mins
  useEffect(() => {
  const timer = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(timer);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, []);
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setShowDropdown(false);
    setCode(CODE_TEMPLATES[lang] ?? "");
  }, []);

  const handleRunCode = useCallback(async () => {
    setIsRunning(true);
    try {
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setBattleFinished(true);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

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

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-[#050505] font-['Space_Grotesk'] overflow-hidden">
      {/* ── Top Status Bar ────────────────────────────── */}
      <header className="h-10 bg-[#0D0D0D] border-b border-[#8A8A8A]/20 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#FFC107]" />
          <span className="text-[10px] font-bold text-[#FFC107] uppercase tracking-[0.08em]">
            {problem?.title || "Battle Arena"}
          </span>
        </div>

        <div className="flex-1 flex items-center gap-4 mx-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#FFC107]" />
          </div>
          <div className="h-1 flex-1 bg-[#111111] rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-[#FFC107] to-[#FFD54F]" />
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <DifficultyBadge difficulty={problem?.difficulty || "medium"} />
          
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#111111] rounded border border-[#555555]">
            <span className="text-[10px] text-[#8A8A8A]">Participants:</span>
            <span className="text-[10px] font-bold text-[#FFC107]">{players.length}</span>
          </div>

          {!isPractice && violationCount > 0 && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
              violationCount >= 2 ? "bg-[#ff6b6b]/20 border-[#ff6b6b] animate-pulse" : "bg-[#FFC107]/20 border-[#FFC107]"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 text-[#FFC107]" />
              <span className="text-[10px] font-bold text-[#FFC107]">{violationCount}/3</span>
            </div>
          )}

          <button
            onClick={() => setProblemVisible(!problemVisible)}
            title="Toggle problem panel"
            className="p-1.5 text-[#8A8A8A] hover:text-[#FFC107] hover:bg-[#111111] rounded transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
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
        {/* Problem Panel (Collapsible) */}
        {problemVisible && (
          <div className="w-80 shrink-0 overflow-y-auto bg-[#050505] border-r border-[#8A8A8A]/20 px-5 py-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-base font-bold text-[#ffffff] leading-tight">{problem?.title || "Loading…"}</h1>
              <button
                onClick={() => setProblemVisible(false)}
                className="p-1 text-[#8A8A8A] hover:text-[#FFC107] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {problem?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((tag: string) => (
                  <span key={tag} className="text-[10px] px-2 py-1 rounded bg-[#111111] border border-[#555555] text-[#F5F5F5]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-invert prose-sm max-w-none text-[#F5F5F5] text-sm leading-relaxed">
              <p>{problem?.description}</p>
            </div>

            {problem?.sampleInput && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[#FFC107] uppercase">Input Format</p>
                <pre className="bg-[#0D0D0D] border border-[#555555] rounded px-3 py-2 text-xs text-[#00cc44] overflow-x-auto">
                  {problem.sampleInput}
                </pre>
              </div>
            )}

            {problem?.sampleOutput && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[#FFC107] uppercase">Output Format</p>
                <pre className="bg-[#0D0D0D] border border-[#555555] rounded px-3 py-2 text-xs text-[#66b3ff] overflow-x-auto">
                  {problem.sampleOutput}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Center Panel: Editor & Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="h-10 bg-[#0D0D0D] border-b border-[#8A8A8A]/20 flex items-center px-3 gap-2 shrink-0">
            <span className="text-[10px] font-bold text-[#FFC107] uppercase tracking-[0.08em]">Editor</span>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] bg-[#111111] hover:bg-[#2e2e2e] border border-[#555555] rounded text-[#ffffff] transition-colors"
                disabled={battleFinished}
              >
                {currentLang.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-[#0D0D0D] border border-[#555555] rounded shadow-lg z-50 min-w-[130px] overflow-hidden">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => handleLanguageChange(lang.value)}
                      className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                        language === lang.value
                          ? "bg-[#FFC107]/20 text-[#FFC107] font-semibold"
                          : "text-[#F5F5F5] hover:bg-[#111111]"
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
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting || battleFinished}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-50 text-white font-bold rounded transition-colors"
            >
              {isRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>

            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || battleFinished}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#FFC107] hover:bg-[#FFD54F] disabled:opacity-50 text-black font-bold rounded transition-colors"
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
              onMount={(ed) => (editorRef.current = ed)}
              theme="cyber-arena"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: "on",
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoIndent: "full",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
                tabSize: language === "python" ? 4 : 2,
                readOnly: battleFinished,
                contextmenu: false,
              }}
            />
          </div>

          {/* Terminal */}
          <div className="h-40 overflow-y-auto bg-[#050505] border-t border-[#8A8A8A]/20 px-4 py-3">
            <div className="px-4 py-2 border-b border-[#8A8A8A]/20 flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-[#FFC107] uppercase">Terminal Output</span>
              {executionResult?.executionTime && <span className="text-[9px] text-[#8A8A8A] ml-auto">{executionResult.executionTime}ms</span>}
            </div>

            {isRunning || isSubmitting ? (
              <div className="flex items-center gap-2 text-[#F5F5F5]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FFC107]" />
                {isRunning ? "Running code…" : "Submitting…"}
              </div>
            ) : executionResult ? (
              <div className="space-y-2">
                {executionResult.success ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00cc44] mt-0.5" />
                    <div>
                      <p className="text-[#00cc44] font-semibold mb-1">Execution Successful</p>
                      <pre className="bg-[#0D0D0D] border border-[#00cc44]/20 rounded p-2 text-xs text-[#00cc44] overflow-auto max-h-24">
                        {executionResult.output}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#ff6b6b] mt-0.5" />
                    <div>
                      <p className="text-[#ff6b6b] font-semibold mb-1">Execution Failed</p>
                      <pre className="bg-[#0D0D0D] border border-[#ff6b6b]/20 rounded p-2 text-xs text-[#ff6b6b] overflow-auto max-h-24">
                        {executionResult.error || executionResult.output}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[#8A8A8A]">Output will appear here…</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Bar ────────────────────────────────── */}
      <footer className="h-8 bg-gradient-to-r from-[#FFC107] to-[#FFD54F] border-t border-[#FFC107]/20 flex items-center px-4 text-[10px] text-black font-bold uppercase tracking-wider shrink-0">
        <span>CodeWar Arena</span>
        <span className="mx-2">•</span>
        <span>{currentLang.label}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <span>{players.filter((p) => p.isSolved).length}/{players.length} Solved</span>
          <div className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
          <span>Auto-saving</span>
        </div>
      </footer>

      {/* ── Results Modal ─────────────────────────────── */}
      {battleFinished && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-[#FFC107]/20 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#FFC107] to-[#FFD54F] px-6 py-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-black" />
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                {isFlagged ? "Submission Flagged" : "Battle Concluded"}
              </h2>
            </div>

            <div className="p-4 space-y-2">
              {players.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded border ${
                  p.id === user.id
                    ? "bg-[#FFC107]/10 border-[#FFC107]/20"
                    : "bg-[#111111] border-[#555555]"
                }`}>
                  {p.isSolved ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00cc44]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#ff6b6b]" />
                  )}
                  <span className="flex-1 text-sm text-[#ffffff]">
                    {p.username}
                    {p.id === user.id && <span className="text-[#8A8A8A] ml-1">(you)</span>}
                  </span>
                  <span className="text-xs text-[#8A8A8A]">{Math.floor(p.progress)}% · {p.currentScore}pts</span>
                </div>
              ))}
            </div>

            {isFlagged && (
              <div className="mx-4 mb-4 p-3 bg-[#ff6b6b]/20 border border-[#ff6b6b]/30 rounded text-xs text-[#ff6b6b]">
                <p className="font-semibold mb-1">Violations Detected</p>
                <p>Your submission has been flagged for contest violations.</p>
              </div>
            )}

            <div className="px-4 pb-4">
              <button
                onClick={onExitBattle}
                className="w-full py-2.5 bg-[#FFC107] hover:bg-[#FFD54F] text-black font-bold text-sm rounded transition-colors"
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