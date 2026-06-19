import React from "react";
import { Play, Code, Trophy, ShieldCheck, Zap, X } from "lucide-react";

interface HowToPlayProps {
  onClose?: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  const steps = [
    {
      id: "step-1",
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      title: "1. Select Difficulty & Matchmake",
      desc: "Pick Easy, Medium, or Hard depending on your skill tier. Our matchmaker pairs you with an opponent of similar rating. If no opponent connects within 6 seconds, an intelligent AI Opponent joins the battleground!"
    },
    {
      id: "step-2",
      icon: <Code className="w-5 h-5 text-amber-400" />,
      title: "2. Write & Compile Code",
      desc: "Implement your algorithm inside the multi-language workspace (C, C++, Java, Python, JavaScript). Your environment compiles directly against 3 visible test templates. Speed up to boost your WPM ranking index!"
    },
    {
      id: "step-3",
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      title: "3. Clear Test Cases & Claim Victory",
      desc: "To lock in the win, you must satisfy ALL visible and hidden test scenarios. Solve before your timer expires. Discharging correct solutions boosts your Global ELO Rating and fuels your hacking streak!"
    },
    {
      id: "step-4",
      icon: <ShieldCheck className="w-5 h-5 text-red-400 animate-pulse" />,
      title: "🛡️ Strict Anti-Cheat Defenses",
      desc: "Stay locked into your battle viewport! Standard tab switches, minimize events, DevTools console inspection, clipboard pasting, or exiting Fullscreen during matchmaking increments your warning violations count. Reaching 3 warning penalties triggers automated ELO-deducted disqualification."
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl glass-panel p-6 text-gray-200 shadow-2xl relative overflow-hidden my-4 border border-white/10">
      
      {/* Absolute floating golden background accents */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 blur-3xl rounded-full"></div>
      
      {/* Close button option if embedded inside Overlay */}
      {onClose && (
        <button
          id="close_how_btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:text-amber-400 text-gray-400 transition-colors rounded-lg hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-amber-400 tracking-tight flex items-center gap-2">
          <Play className="w-5 h-5 fill-amber-400 text-amber-400" />
          CODING ARENA OPERATIONAL MANUAL
        </h2>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
          Familiarize yourself with battle standards before initiating collision
        </p>
      </div>

      {/* Grid containing instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => (
          <div
            key={step.id}
            id={`step_card_${step.id}`}
            className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-amber-400/20 hover:bg-black/60 transition-all duration-300 flex flex-col gap-2.5 relative group"
          >
            {/* Calligraphy floating tag */}
            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 text-4xl font-mono font-bold transition-opacity">
              {step.id.split("-")[1]}
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-black/50 border border-white/10 group-hover:border-amber-400/30 transition-colors">
                {step.icon}
              </div>
              <h3 className="text-sm font-semibold tracking-wide text-gray-100 group-hover:text-amber-300 transition-colors">
                {step.title}
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-gray-400 group-hover:text-gray-300 transition-colors">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
        <p>⚡ Platform Engine: Powered by unified Node.js Sockets</p>
        <p>⚔️ Standby Status: Operational and Ready</p>
      </div>
    </div>
  );
}
