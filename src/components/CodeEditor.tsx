import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { ChevronDown, Copy, Check, RefreshCw, Play, Upload, AlertCircle } from "lucide-react";

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
  executionStats?: { runtime?: number; memory?: number; cpuUsage?: number };
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
    javascript: `process.stdin.resume();\nprocess.stdin.setEncoding('utf8');\n\nlet input = '';\nprocess.stdin.on('data', d => input += d);\nprocess.stdin.on('end', () => {\n    const lines = input.split('\\n');\n});`,
  };
  return templates[lang] ?? "";
};

const STORAGE_KEY = (lang: string) => `cw_code_${lang}`;
const LAST_SAVED_KEY = (lang: string) => `cw_saved_${lang}`;

const defineCyberArenaTheme = () => {
  if (typeof window !== "undefined" && (window as any).monaco) {
    const monaco = (window as any).monaco;
    monaco.editor.defineTheme("cyber-arena", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "#ffc700", fontStyle: "bold" },
        { token: "keyword.control", foreground: "#ffd700" },
        { token: "string", foreground: "#00cc44" },
        { token: "string.escape", foreground: "#66ff99" },
        { token: "comment", foreground: "#999999", fontStyle: "italic" },
        { token: "number", foreground: "#66b3ff" },
        { token: "entity.name.function", foreground: "#ffaa55" },
        { token: "entity.name.type", foreground: "#00cc44" },
        { token: "storage.type", foreground: "#ffc700" },
        { token: "variable", foreground: "#e0e0e0" },
        { token: "keyword.operator", foreground: "#ffc700" },
        { token: "delimiter.bracket", foreground: "#999999" },
      ],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.foreground": "#e0e0e0",
        "editor.lineNumbersBackground": "#000000",
        "editor.lineNumbersForeground": "#555555",
        "editor.selectionBackground": "#ffc700" + "40",
        "editor.selectionHighlightBackground": "#00cc44" + "20",
        "editorCursor.foreground": "#ffc700",
        "editorWhitespace.foreground": "#555555" + "80",
        "editorBracketMatch.background": "#ffc700" + "20",
        "editorBracketMatch.border": "#ffc700" + "60",
        "editor.findMatchBackground": "#ffd700" + "40",
        "editor.findMatchHighlightBackground": "#00cc44" + "30",
      },
    });
  }
};

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
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    defineCyberArenaTheme();
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(language));
      if (saved && !code) setCode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!code) return;
    setUnsavedChanges(true);
    const id = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY(language), code);
        localStorage.setItem(LAST_SAVED_KEY(language), new Date().toISOString());
        setSaveIndicator("saving");
        setTimeout(() => setSaveIndicator("idle"), 600);
        setUnsavedChanges(false);
      } catch (err) {
        setSaveIndicator("error");
        setTimeout(() => setSaveIndicator("idle"), 3000);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [code, language]);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setShowDropdown(false);
    try {
      const saved = localStorage.getItem(STORAGE_KEY(lang));
      setCode(saved ?? getDefaultCode(lang));
    } catch {
      setCode(getDefaultCode(lang));
    }
  }, [setLanguage, setCode]);

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

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.value === language) ?? SUPPORTED_LANGUAGES[0];
  const busy = isRunning || isSubmitting;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden font-['Space_Grotesk']"
    >
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#999999]/20 px-3 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-[#ffc700] uppercase tracking-[0.08em]">Editor</span>
        {unsavedChanges && (
          <span className="text-[9px] text-[#ffc700] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Unsaved
          </span>
        )}

        {/* Language Picker */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => !disabled && setShowDropdown((v) => !v)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] bg-[#242424] hover:bg-[#2e2e2e] border border-[#555555] hover:border-[#ffc700]/50 rounded text-[#ffffff] disabled:opacity-40 transition-colors"
          >
            {currentLang.label}
            <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDropdown && (
            <ul className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#555555] rounded shadow-2xl z-50 min-w-[130px] py-1 overflow-hidden">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <li key={lang.value}>
                  <button
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                      language === lang.value
                        ? "bg-[#ffc700]/20 text-[#ffc700] font-semibold"
                        : "text-[#cccccc] hover:bg-[#242424]"
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
          <button
            onClick={handleCopy}
            disabled={disabled || !code}
            className="p-1.5 text-[#999999] hover:text-[#ffc700] hover:bg-[#242424] rounded disabled:opacity-40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00cc44]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#242424] rounded border border-[#555555]">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                saveIndicator === "saving" ? "bg-[#ffc700] animate-pulse" : saveIndicator === "error" ? "bg-[#ff6b6b]" : "bg-[#00cc44]"
              }`}
            />
            <span className="text-[9px] text-[#999999] whitespace-nowrap">
              {saveIndicator === "saving" ? "Saving…" : saveIndicator === "error" ? "Save failed" : "Auto-saved"}
            </span>
          </div>
        </div>
      </div>

      {/* Editor */}
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
            fontFamily: "'JetBrains Mono', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            padding: { top: 14, bottom: 14 },
            quickSuggestions: { other: true, comments: false, strings: false },
            tabSize: language === "python" ? 4 : 2,
            readOnly: disabled,
            contextmenu: false,
            lineHeight: 22,
            letterSpacing: 0.5,
          }}
        />
      </div>

      {/* Footer */}
      <div className="bg-[#1a1a1a] border-t border-[#999999]/20 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={onRun}
          disabled={disabled || isRunning || isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] disabled:opacity-50 text-white text-xs font-bold rounded transition-colors"
        >
          {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? "Running…" : "Run"}
        </button>

        <button
          onClick={onSubmit}
          disabled={disabled || isRunning || isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffc700] hover:bg-[#ffd700] disabled:opacity-50 text-black text-xs font-bold rounded transition-colors"
        >
          {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>

        {executionStats && (
          <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-[#242424] rounded border border-[#555555]">
            {executionStats.runtime && <span className="text-[9px] text-[#999999]">{executionStats.runtime}ms</span>}
            {executionStats.memory && <span className="text-[9px] text-[#999999]">{executionStats.memory}MB</span>}
          </div>
        )}

        <div className="flex-1" />
      </div>
    </div>
  );
});