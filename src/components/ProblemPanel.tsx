import React, { useState } from "react";
import { ChevronDown, Copy, Check } from "lucide-react";

interface ProblemPanelProps {
  problem: any;
  isLoading?: boolean;
}

export default function ProblemPanel({ problem, isLoading }: ProblemPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    constraints: false,
    inputFormat: false,
    outputFormat: false,
    sampleInput: false,
    sampleOutput: false,
    explanation: false
  });
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border border-white/5 rounded-lg overflow-hidden animate-pulse">
        <div className="bg-zinc-900 border-b border-white/5 p-4">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-white/5 rounded w-1/2"></div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="h-4 bg-white/10 rounded"></div>
          <div className="h-4 bg-white/10 rounded w-5/6"></div>
          <div className="h-4 bg-white/10 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border border-white/5 rounded-lg overflow-hidden justify-center items-center p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-amber-400 font-semibold mb-2">Problem Loading</p>
        <p className="text-gray-400 text-xs">Connecting to problem database...</p>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "hard":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "●";
      case "medium":
        return "●●";
      case "hard":
        return "●●●";
      default:
        return "?";
    }
  };

  const SectionHeader = ({ 
    title, 
    section, 
    icon 
  }: { 
    title: string; 
    section: keyof typeof expandedSections;
    icon: string;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-amber-400/30 transition-colors group"
    >
      <span className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
        <span>{icon}</span>
        {title}
      </span>
      <ChevronDown 
        className={`w-4 h-4 text-gray-400 group-hover:text-amber-400 transition-transform ${
          expandedSections[section] ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  const SectionContent = ({
    content,
    section,
    mono = false
  }: {
    content: string;
    section: string;
    mono?: boolean;
  }) => (
    <div className={`px-3 py-2.5 bg-black/30 border-l-2 border-amber-400/30 flex items-start justify-between gap-3 group ${
      mono ? "font-mono text-xs" : "text-xs text-gray-300 leading-relaxed"
    }`}>
      <p className="flex-1 whitespace-pre-wrap">{content}</p>
      <button
        onClick={() => copyToClipboard(content, section)}
        className="mt-0.5 p-1 bg-white/5 hover:bg-amber-400/20 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Copy to clipboard"
      >
        {copiedSection === section ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3 text-gray-400" />
        )}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-white/5 px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider font-mono mb-2">
              Problem: {problem.title || "Untitled"}
            </h2>
            <p className="text-xs text-gray-400 mb-3">{problem.categoryId || "General"}</p>
          </div>
          <div className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${getDifficultyColor(problem.difficulty)}`}>
            {getDifficultyIcon(problem.difficulty)} {problem.difficulty || "Unknown"}
          </div>
        </div>
        
        {/* Problem ID & Acceptance Rate */}
        <div className="flex gap-4 text-[10px] font-mono text-gray-500">
          <span>ID: {problem._id?.toString().slice(-6) || "N/A"}</span>
          <span>•</span>
          <span>Acceptance: {problem.acceptanceRate || 0}%</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-0.5 p-3">
        
        {/* Description Section */}
        <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
          <SectionHeader title="Description" section="description" icon="📝" />
          {expandedSections.description && (
            <SectionContent 
              content={problem.description || "No description available."} 
              section="description"
            />
          )}
        </div>

        {/* Constraints Section */}
        {problem.constraints && (
          <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
            <SectionHeader title="Constraints" section="constraints" icon="⚙️" />
            {expandedSections.constraints && (
              <SectionContent 
                content={problem.constraints} 
                section="constraints"
              />
            )}
          </div>
        )}

        {/* Input Format Section */}
        {problem.inputFormat && (
          <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
            <SectionHeader title="Input Format" section="inputFormat" icon="📥" />
            {expandedSections.inputFormat && (
              <SectionContent 
                content={problem.inputFormat} 
                section="inputFormat"
              />
            )}
          </div>
        )}

        {/* Output Format Section */}
        {problem.outputFormat && (
          <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
            <SectionHeader title="Output Format" section="outputFormat" icon="📤" />
            {expandedSections.outputFormat && (
              <SectionContent 
                content={problem.outputFormat} 
                section="outputFormat"
              />
            )}
          </div>
        )}

        {/* Sample Input Section */}
        {problem.sampleInput && (
          <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
            <SectionHeader title="Sample Input" section="sampleInput" icon="💾" />
            {expandedSections.sampleInput && (
              <SectionContent 
                content={problem.sampleInput} 
                section="sampleInput"
                mono={true}
              />
            )}
          </div>
        )}

        {/* Sample Output Section */}
        {problem.sampleOutput && (
          <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
            <SectionHeader title="Sample Output" section="sampleOutput" icon="💾" />
            {expandedSections.sampleOutput && (
              <SectionContent 
                content={problem.sampleOutput} 
                section="sampleOutput"
                mono={true}
              />
            )}
          </div>
        )}

        {/* Explanation Section */}
        {problem.explanation && (
          <div className="bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5">
            <SectionHeader title="Explanation" section="explanation" icon="💡" />
            {expandedSections.explanation && (
              <SectionContent 
                content={problem.explanation} 
                section="explanation"
              />
            )}
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="bg-black/50 border-t border-white/5 px-4 py-2 text-[10px] text-gray-500 flex items-center justify-between">
        <span>Click sections to expand/collapse</span>
        <span>•</span>
        <span>Hover to copy content</span>
      </div>
    </div>
  );
}
