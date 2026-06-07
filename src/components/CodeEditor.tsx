/**
 * CYBER ARENA - CODE EDITOR
 * Refactored with complete Cyber Arena design system
 *
 * Design System:
 *   - Color Palette: Deep black (#131313), Orange primary (#ffdca1), Neon Green (#27ff97)
 *   - Typography: Space Grotesk (UI), JetBrains Mono (code)
 *   - Elevation: Tonal layering with luminous borders
 *   - Spacing: Precision grid (1rem = 16px base)
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
 * Monaco-based code editor with language picker, copy, run, submit
 * Fully styled with Cyber Arena design system
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

  // ── Auto-save every 3s
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
    <div className="flex flex-col h-full bg-[#131313] overflow-hidden font-['Space_Grotesk']">
      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-[#1c1b1b] border-b border-white/5 px-3 py-2 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-[#ffdca1] uppercase tracking-[0.08em]">
          Editor
        </span>

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
                <li key={lang.value} role="option" aria-selected={language === lang.value}>
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
      </div>

      {/* ── Monaco Editor ──────────────────────────────── */}
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
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            tabSize: language === "python" ? 4 : 2,
            readOnly: disabled,
            lineHeight: 22,
            letterSpacing: 0.5,
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

        {/* Save Indicator */}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#9e8f78] font-['Space_Grotesk']">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              saveIndicator === "saving"
                ? "bg-[#ffdca1]"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          {saveIndicator === "saving" ? "Saving…" : "Auto-saved"}
        </div>
      </div>
    </div>
  );
});