/**
 * CYBER ARENA - CODE EDITOR (ENHANCED)
 * Premium secure coding editor with Monaco integration
 *
 * Features:
 *   - Custom "Cyber Arena" theme with golden accents
 *   - Context menu and dangerous actions disabled
 *   - Auto-save with recovery system
 *   - Fullscreen editor mode
 *   - Execution statistics display
 *   - Syntax highlighting optimized for competitive programming
 *   - Code draft preservation across sessions
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import {
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  Play,
  Upload,
  Maximize,
  Minimize,
  AlertCircle,
  SaveIcon,
} from "lucide-react";

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  disabled?: boolean;
  onRun: () => void;
  onSubmit: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  executionStats?: {
    runtime?: number;
    memory?: number;
    cpuUsage?: number;
  };
}

interface Language {
  label: string;
  value: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
];

const getDefaultCode = (lang: string): string => {
  const templates: Record<string, string> = {
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}`,
    c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    \n    return 0;\n}`,
    java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}`,
    python: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    pass\n\nsolve()`,
    javascript: `process.stdin.resume();\nprocess.stdin.setEncoding('utf8');\n\nlet input = '';\nprocess.stdin.on('data', d => input += d);\nprocess.stdin.on('end', () => {\n    const lines = input.split('\\n');\n    // solve here\n});`,
  };
  return templates[lang] ?? "";
};

const STORAGE_KEY = (lang: string) => `cw_code_${lang}`;
const LAST_SAVED_KEY = (lang: string) => `cw_saved_${lang}`;

/**
 * Define custom Cyber Arena theme for Monaco
 */
const defineCyberArenaTheme = () => {
  if (typeof window !== "undefined" && (window as any).monaco) {
    const monaco = (window as any).monaco;
    monaco.editor.defineTheme("cyber-arena", {
      base: "vs-dark",
      inherit: true,
      rules: [
        // Keywords - Premium Gold
        { token: "keyword", foreground: "#ffdca1", fontStyle: "bold" },
        { token: "keyword.control", foreground: "#ffba20" },

        // Strings - Emerald Green
        { token: "string", foreground: "#27ff97" },
        { token: "string.escape", foreground: "#5bffa1" },

        // Comments - Muted Bronze
        { token: "comment", foreground: "#9e8f78", fontStyle: "italic" },

        // Numbers - Cyan
        { token: "number", foreground: "#5eb3f6" },

        // Functions - Light Orange
        { token: "entity.name.function", foreground: "#ffb366" },

        // Types - Secondary Green
        { token: "entity.name.type", foreground: "#27ff97" },
        { token: "storage.type", foreground: "#ffdca1" },

        // Variables - Soft White
        { token: "variable", foreground: "#d5c4ab" },

        // Operators - Gold
        { token: "keyword.operator", foreground: "#ffdca1" },

        // Brackets - Subtle
        { token: "delimiter.bracket", foreground: "#9e8f78" },
        { token: "delimiter.parenthesis", foreground: "#9e8f78" },
      ],
      colors: {
        "editor.background": "#131313",
        "editor.foreground": "#d5c4ab",
        "editor.lineNumbersBackground": "#0e0e0e",
        "editor.lineNumbersForeground": "#514532",
        "editor.selectionBackground": "#ffdca1" + "40",
        "editor.selectionHighlightBackground": "#27ff97" + "20",
        "editor.wordHighlightBackground": "#ffdca1" + "20",
        "editor.wordHighlightStrongBackground": "#ffba20" + "20",
        "editorCursor.foreground": "#ffdca1",
        "editorWhitespace.foreground": "#514532" + "80",
        "editorBracketMatch.background": "#ffdca1" + "20",
        "editorBracketMatch.border": "#ffdca1" + "60",
        "editor.findMatchBackground": "#ffba20" + "40",
        "editor.findMatchHighlightBackground": "#27ff97" + "30",
        "editor.findRangeHighlightBackground": "#ffdca1" + "10",
      },
    });
  }
};

/**
 * Monaco-based code editor with enhanced features
 * Styled with premium Cyber Arena design system
 */
export default memo(function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  disabled = false,
  onRun,
  onSubmit,
  isRunning = false,
  isSubmitting = false,
  executionStats,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "error">("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // Define theme on mount
  useEffect(() => {
    defineCyberArenaTheme();
  }, []);

  // ── Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showDropdown]);

  // ── Recover saved code from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(language));
      if (saved && !code) {
        setCode(saved);
        const savedTime = localStorage.getItem(LAST_SAVED_KEY(language));
        if (savedTime) {
          setLastSaveTime(new Date(savedTime));
        }
      }
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  // ── Auto-save every 3s
  useEffect(() => {
    if (!code) return;

    // Track unsaved changes
    setUnsavedChanges(true);

    const id = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY(language), code);
        localStorage.setItem(LAST_SAVED_KEY(language), new Date().toISOString());
        setSaveIndicator("saving");
        setLastSaveTime(new Date());
        setTimeout(() => setSaveIndicator("idle"), 600);
        setUnsavedChanges(false);
      } catch (err) {
        setSaveIndicator("error");
        setTimeout(() => setSaveIndicator("idle"), 3000);
      }
    }, 3000);

    return () => clearInterval(id);
  }, [code, language]);

  // ── When language changes, restore saved code or fall back to template
  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      setShowDropdown(false);
      try {
        const saved = localStorage.getItem(STORAGE_KEY(lang));
        setCode(saved ?? getDefaultCode(lang));
        const savedTime = localStorage.getItem(LAST_SAVED_KEY(lang));
        if (savedTime) {
          setLastSaveTime(new Date(savedTime));
        }
      } catch {
        setCode(getDefaultCode(lang));
      }
    },
    [setLanguage, setCode]
  );

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    defineCyberArenaTheme();
  }, []);

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  }, [isFullscreen]);

  const clearCode = useCallback(() => {
    if (confirm("Clear all code? This cannot be undone.")) {
      setCode("");
      try {
        localStorage.removeItem(STORAGE_KEY(language));
      } catch {
        // Silent fail
      }
    }
  }, [language, setCode]);

  const resetToTemplate = useCallback(() => {
    if (confirm("Reset to template?")) {
      setCode(getDefaultCode(language));
    }
  }, [language, setCode]);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.value === language) ??
    SUPPORTED_LANGUAGES[0];

  const busy = isRunning || isSubmitting;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-[#131313] overflow-hidden font-['Space_Grotesk'] ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-[#1c1b1b] border-b border-white/5 px-3 py-2.5 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em]">
            Editor
          </span>
          {unsavedChanges && (
            <span className="text-[9px] text-amber-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Unsaved
            </span>
          )}
        </div>

        {/* Language Picker */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => !disabled && setShowDropdown((v) => !v)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            aria-label="Select programming language"
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ffdca1]/30 rounded text-[#d5c4ab] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-['Space_Grotesk']"
          >
            {currentLang.label}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showDropdown && (
            <ul
              role="listbox"
              aria-label="Language options"
              className="absolute top-full left-0 mt-1 bg-[#1c1b1b] border border-white/10 rounded shadow-2xl z-50 min-w-[130px] py-1 overflow-hidden"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <li
                  key={lang.value}
                  role="option"
                  aria-selected={language === lang.value}
                >
                  <button
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors font-['Space_Grotesk'] ${
                      language === lang.value
                        ? "bg-[#ffdca1]/15 text-[#ffdca1] font-semibold"
                        : "text-[#d5c4ab] hover:bg-white/5"
                    }`}
                  >
                    {lang.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={disabled || !code}
            aria-label="Copy code to clipboard"
            title="Copy code"
            className="p-1.5 text-[#9e8f78] hover:text-[#ffdca1] hover:bg-white/5 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            disabled={disabled}
            aria-label="Toggle fullscreen"
            title="Fullscreen"
            className="p-1.5 text-[#9e8f78] hover:text-[#ffdca1] hover:bg-white/5 rounded disabled:opacity-40 transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5" />
            ) : (
              <Maximize className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Save Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/10">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                saveIndicator === "saving"
                  ? "bg-[#ffdca1] animate-pulse"
                  : saveIndicator === "error"
                  ? "bg-red-500"
                  : "bg-emerald-400"
              }`}
            />
            <span className="text-[9px] text-[#9e8f78] whitespace-nowrap font-['Space_Grotesk']">
              {saveIndicator === "saving"
                ? "Saving…"
                : saveIndicator === "error"
                ? "Save failed"
                : "Auto-saved"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Monaco Editor ──────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          onMount={handleEditorMount}
          theme="cyber-arena"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Menlo', 'Fira Code', 'Courier New', monospace",
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
            padding: { top: 14, bottom: 14 },
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
            tabSize: language === "python" ? 4 : 2,
            readOnly: disabled,
            contextmenu: false,
            lineHeight: 22,
            letterSpacing: 0.5,
            // Security: Disable dangerous actions
           
          }}
          loading={
            <div className="w-full h-full bg-[#131313] flex items-center justify-center">
              <div className="flex items-center gap-2 text-[#9e8f78] text-sm font-['Space_Grotesk']">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading editor…
              </div>
            </div>
          }
        />
      </div>

      {/* ── Footer ────────────────────────────────────── */}
      <div className="bg-[#1c1b1b] border-t border-white/5 px-3 py-2 flex items-center gap-2 shrink-0">
        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={disabled || busy}
          aria-label="Run code against sample input"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors active:scale-[0.98] font-['Space_Grotesk']"
        >
          {isRunning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isRunning ? "Running…" : "Run"}
        </button>

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          disabled={disabled || busy}
          aria-label="Submit code for full judge evaluation"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors active:scale-[0.98] font-['Space_Grotesk']"
        >
          {isSubmitting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>

        {/* Stats Display */}
        {executionStats && (
          <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-white/5 rounded border border-white/10">
            {executionStats.runtime && (
              <span className="text-[9px] text-[#9e8f78]">
                {executionStats.runtime}ms
              </span>
            )}
            {executionStats.memory && (
              <span className="text-[9px] text-[#9e8f78]">
                {executionStats.memory}MB
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Save Info */}
        <div className="flex items-center gap-1.5 text-[9px] text-[#9e8f78] font-['Space_Grotesk']">
          {lastSaveTime && (
            <span>
              Last saved: {lastSaveTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});