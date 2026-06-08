import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { ChevronDown, Copy, Check, RefreshCw, Play, Upload, AlertCircle } from "lucide-react";

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  onLanguageChange?: (lang: string) => void;
  disabled?: boolean;
  onRun: () => void;
  onSubmit: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  executionStats?: { runtime?: number; memory?: number; cpuUsage?: number };
  fileName?: string;
}

interface Language {
  label: string;
  value: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
];

export const getDefaultCode = (lang: string): string => {
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

export const defineCodewarTheme = (monaco: typeof import("monaco-editor")) => {
  monaco.editor.defineTheme("codewar-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "FFC107", fontStyle: "bold" },
      { token: "keyword.control", foreground: "FFD54F" },
      { token: "keyword.operator", foreground: "E0C060" },
      { token: "storage.type", foreground: "FFC107" },
      { token: "string", foreground: "7EC699" },
      { token: "string.escape", foreground: "98C379" },
      { token: "number", foreground: "66B3FF" },
      { token: "constant", foreground: "66B3FF" },
      { token: "comment", foreground: "6A737D", fontStyle: "italic" },
      { token: "entity.name.function", foreground: "FFD54F" },
      { token: "entity.name.type", foreground: "4EC9B0" },
      { token: "variable", foreground: "E8E8E8" },
      { token: "variable.parameter", foreground: "9CDCFE" },
      { token: "delimiter", foreground: "C8C8C8" },
      { token: "tag", foreground: "FFC107" },
      { token: "attribute.name", foreground: "9CDCFE" },
    ],
    colors: {
      "editor.background": "#0A0A0A",
      "editor.foreground": "#E8E8E8",
      "editor.lineHighlightBackground": "#141414",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#4A4A4A",
      "editorLineNumber.activeForeground": "#FFC107",
      "editorGutter.background": "#0A0A0A",
      "editorCursor.foreground": "#FFC107",
      "editorCursor.background": "#0A0A0A",
      "editor.selectionBackground": "#FFC10730",
      "editor.selectionHighlightBackground": "#FFD54F18",
      "editor.inactiveSelectionBackground": "#FFC10718",
      "editor.findMatchBackground": "#FFC10740",
      "editor.findMatchHighlightBackground": "#FFD54F25",
      "editorBracketMatch.background": "#FFC10720",
      "editorBracketMatch.border": "#FFC10770",
      "editorIndentGuide.background": "#1E1E1E",
      "editorIndentGuide.activeBackground": "#333333",
      "editorWidget.background": "#111111",
      "editorWidget.border": "#333333",
      "editorSuggestWidget.background": "#111111",
      "editorSuggestWidget.border": "#333333",
      "editorHoverWidget.background": "#111111",
      "editorHoverWidget.border": "#333333",
      "minimap.background": "#0A0A0A",
      "scrollbarSlider.background": "#33333380",
      "scrollbarSlider.hoverBackground": "#444444AA",
      "scrollbarSlider.activeBackground": "#FFC10750",
    },
  });
};

const LANG_EXT: Record<string, string> = {
  cpp: "CPP",
  c: "C",
  java: "JAVA",
  python: "PY",
  javascript: "JS",
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
  fileName,
  onLanguageChange,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "error">("idle");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
    } catch {
      /* ignore */
    }
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
      } catch {
        setSaveIndicator("error");
        setTimeout(() => setSaveIndicator("idle"), 3000);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [code, language, setCode]);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setShowDropdown(false);
      if (onLanguageChange) {
        onLanguageChange(lang);
        return;
      }
      setLanguage(lang);
      try {
        const saved = localStorage.getItem(STORAGE_KEY(lang));
        setCode(saved ?? getDefaultCode(lang));
      } catch {
        setCode(getDefaultCode(lang));
      }
    },
    [setLanguage, setCode, onLanguageChange]
  );

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    defineCodewarTheme(monaco);
  }, []);

  const handleEditorMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;
    defineCodewarTheme(monaco);
    monaco.editor.setTheme("codewar-dark");
    editorInstance.focus();

    const domNode = editorInstance.getDomNode();
    if (domNode) {
      domNode.addEventListener("copy", (e) => e.preventDefault(), true);
      domNode.addEventListener("cut", (e) => e.preventDefault(), true);
      domNode.addEventListener("paste", (e) => e.preventDefault(), true);
      domNode.addEventListener("contextmenu", (e) => e.preventDefault(), true);
    }
  }, []);

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.value === language) ?? SUPPORTED_LANGUAGES[0];
  const displayFile = fileName ?? `SOLUTION.${LANG_EXT[language] ?? "TXT"}`;

  return (
    <div className="codewar-editor flex flex-col h-full overflow-hidden">
      {/* VS Code editor tab bar */}
      <div className="vscode-editor-tabbar px-4 py-2 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Code2Icon />
          <span className="text-[11px] font-semibold text-[#E8E8E8] tracking-wide truncate">{displayFile}</span>
        </div>

        <div className="h-4 w-px bg-[#2A2A2A]" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => !disabled && setShowDropdown((v) => !v)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-[#141414] hover:bg-[#1C1C1C] border border-[#333] hover:border-[#FFC107]/40 rounded text-[#E8E8E8] disabled:opacity-40 transition-all"
          >
            {currentLang.label}
            <ChevronDown className={`w-3 h-3 text-[#8A8A8A] transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDropdown && (
            <ul className="absolute top-full left-0 mt-1 bg-[#111] border border-[#333] rounded-md shadow-2xl z-50 min-w-[140px] py-1 overflow-hidden">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <li key={lang.value}>
                  <button
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                      language === lang.value
                        ? "bg-[#FFC107]/15 text-[#FFC107] font-semibold"
                        : "text-[#C8C8C8] hover:bg-[#1A1A1A]"
                    }`}
                  >
                    {lang.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {unsavedChanges && (
          <span className="text-[10px] text-[#FFC107]/80 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Unsaved
          </span>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#111] rounded border border-[#2A2A2A]">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              saveIndicator === "saving"
                ? "bg-[#FFC107] animate-pulse"
                : saveIndicator === "error"
                  ? "bg-[#FF6B6B]"
                  : "bg-[#4EC9B0]"
            }`}
          />
          <span className="text-[10px] text-[#8A8A8A] whitespace-nowrap">
            {saveIndicator === "saving" ? "Saving…" : saveIndicator === "error" ? "Save failed" : "Autosave: Active"}
          </span>
        </div>

        <button
          onClick={handleCopy}
          disabled={disabled || !code}
          className="p-1.5 text-[#6A6A6A] hover:text-[#FFC107] hover:bg-[#141414] rounded disabled:opacity-40 transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#4EC9B0]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onRun}
          disabled={disabled || isRunning || isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3A5C] hover:bg-[#1E4A72] border border-[#2A5A8C]/50 disabled:opacity-50 text-[#7CB9FF] text-[11px] font-bold rounded transition-colors"
        >
          {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? "Running…" : "Run Tests"}
        </button>

        <button
          onClick={onSubmit}
          disabled={disabled || isRunning || isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFC107] hover:bg-[#FFD54F] disabled:opacity-50 text-black text-[11px] font-bold rounded shadow-[0_0_12px_rgba(255,193,7,0.25)] transition-colors"
        >
          {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>

        {executionStats && (executionStats.runtime || executionStats.memory) && (
          <div className="flex items-center gap-2 px-2 py-1 bg-[#111] rounded border border-[#2A2A2A]">
            {executionStats.runtime != null && (
              <span className="text-[10px] text-[#8A8A8A]">{executionStats.runtime}ms</span>
            )}
            {executionStats.memory != null && (
              <span className="text-[10px] text-[#8A8A8A]">{executionStats.memory}KB</span>
            )}
          </div>
        )}
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          theme="codewar-dark"
          loading={
            <div className="flex items-center justify-center h-full text-[#8A8A8A] text-sm" style={{ background: "#0a0a0a" }}>
              Loading editor…
            </div>
          }
          options={{
            minimap: { enabled: true, scale: 1, maxColumn: 72, renderCharacters: false, showSlider: "mouseover" },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            cursorWidth: 2,
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            quickSuggestions: { other: true, comments: false, strings: false },
            tabSize: language === "python" ? 4 : 2,
            readOnly: disabled,
            contextmenu: false,
            lineHeight: 22,
            letterSpacing: 0.3,
            renderLineHighlight: "line",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              useShadows: false,
            },
          }}
        />
      </div>
    </div>
  );
});

function Code2Icon() {
  return (
    <svg className="w-3.5 h-3.5 text-[#FFC107] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
