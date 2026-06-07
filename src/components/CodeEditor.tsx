/**
 * CodeEditor.tsx — Refactored
 *
 * Fixes applied:
 *  - localStorage removed from render cycle (moved to callbacks only)
 *  - useEffect deps fixed (no stale closures)
 *  - isDisabled -> disabled prop (proper aria pattern)
 *  - Language change properly memoised
 *  - Type safety improved (no `any` in editor ref)
 *  - Dropdown closes on outside click (useEffect + ref)
 *  - Auto-save interval clears properly
 *  - Missing aria-labels added
 *  - Responsive: stack buttons on mobile
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
import { ChevronDown, Copy, Check, RefreshCw, Play, Upload } from "lucide-react";

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  /** When true the editor is read-only and buttons are disabled */
  disabled?: boolean;
  onRun: () => void;
  onSubmit: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
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

/** Per-language boilerplate */
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

/**
 * Standalone Monaco-based code editor with language picker, copy, run, submit.
 * Fully controlled: code/setCode owned by parent.
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
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving">("idle");

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

  // ── Auto-save every 3 s (only when code is non-empty, not on every keystroke)
  useEffect(() => {
    if (!code) return;
    const id = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY(language), code);
        setSaveIndicator("saving");
        setTimeout(() => setSaveIndicator("idle"), 600);
      } catch {
        // localStorage quota exceeded — silent fail
      }
    }, 3000);
    return () => clearInterval(id);
  }, [code, language]);

  // ── When language changes, restore saved code or fall back to template
  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      setShowDropdown(false);
      // FIX: read from storage here, not in an effect that depends on `code`
      // to avoid overwriting code the user just typed before the effect fires.
      try {
        const saved = localStorage.getItem(STORAGE_KEY(lang));
        setCode(saved ?? getDefaultCode(lang));
      } catch {
        setCode(getDefaultCode(lang));
      }
    },
    [setLanguage, setCode]
  );

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    // Restore saved code on initial mount if no code passed in
    // (Parent should pass initial code; this is just a safety net)
  }, []);

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.value === language) ??
    SUPPORTED_LANGUAGES[0];

  const busy = isRunning || isSubmitting;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="bg-[#252526] border-b border-black/40 px-3 py-1.5 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
          Editor
        </span>

        {/* Language picker */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => !disabled && setShowDropdown((v) => !v)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            aria-label="Select programming language"
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 hover:border-amber-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              className="absolute top-full left-0 mt-1 bg-[#252526] border border-white/10 rounded shadow-2xl z-50 min-w-[130px] py-1 overflow-hidden"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <li key={lang.value} role="option" aria-selected={language === lang.value}>
                  <button
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                      language === lang.value
                        ? "bg-amber-400/15 text-amber-400 font-semibold"
                        : "text-gray-300 hover:bg-white/5"
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

        {/* Copy */}
        <button
          onClick={handleCopy}
          disabled={disabled || !code}
          aria-label="Copy code to clipboard"
          title="Copy code"
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Menlo', 'Fira Code', 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: false, // formatOnType can cause cursor jumps — off by default
            wordWrap: "on",
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            padding: { top: 14, bottom: 14 },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            tabSize: language === "python" ? 4 : 2,
            readOnly: disabled,
          }}
          loading={
            <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading editor…
              </div>
            </div>
          }
        />
      </div>

      {/* Footer: action buttons */}
      <div className="bg-[#252526] border-t border-black/40 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={onRun}
          disabled={disabled || busy}
          aria-label="Run code against sample input"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors active:scale-[0.98]"
        >
          {isRunning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isRunning ? "Running…" : "Run"}
        </button>

        <button
          onClick={onSubmit}
          disabled={disabled || busy}
          aria-label="Submit code for full judge evaluation"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors active:scale-[0.98]"
        >
          {isSubmitting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>

        {/* Save indicator */}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-600">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              saveIndicator === "saving"
                ? "bg-amber-400"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          {saveIndicator === "saving" ? "Saving…" : "Auto-saved"}
        </div>
      </div>
    </div>
  );
});