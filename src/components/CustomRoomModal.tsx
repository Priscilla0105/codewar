import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Copy, Check } from "lucide-react";

interface CustomRoomModalProps {
  roomCode: string;
  difficulty: "Easy" | "Medium" | "Hard";
  isOpen: boolean;
  onClose: () => void;

  loading?: boolean;
  error?: string; // <-- ADD THIS LINE

  onGameStart: () => void;
  waitingForOpponent: boolean;
  opponentJoined?: { username: string; avatar: string } | null;
  currentPlayer: { username: string; avatar: string };
}

export default function CustomRoomModal({
  roomCode,
  difficulty,
  isOpen,
  onClose,
  loading,
  error,
  onGameStart,
  waitingForOpponent,
  opponentJoined,
  currentPlayer,
}: CustomRoomModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="rounded-2xl glass-panel p-6 border border-white/10 max-w-md w-full bg-gradient-to-b from-neutral-900 to-black relative overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">⚔️</span>
          <h2 className="text-lg font-bold text-amber-400 uppercase font-mono">
            Custom Duel Bridge
          </h2>
        </div>

        {/* Difficulty Badge */}
        <div className="mb-6 flex gap-2">
          <span
            className={`text-xs font-bold uppercase px-3 py-1 rounded border ${
              difficulty === "Easy"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : difficulty === "Medium"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {difficulty} Difficulty
          </span>
          {opponentJoined && (
            <span className="text-xs font-bold uppercase px-3 py-1 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Opponent Joined
            </span>
          )}
        </div>

        {/* Share Invite Code */}
        <div className="mb-6">
          <p className="text-[10px] uppercase text-gray-500 font-mono tracking-widest mb-2">
            Share Invite Code
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-neutral-950 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-amber-400">
                {roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-3 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-6">
          <p className="text-[10px] uppercase text-gray-500 font-mono tracking-widest mb-3">
            Ready Participants ({opponentJoined ? 2 : 1} / 2)
          </p>
          <div className="space-y-2">
            {/* Current Player */}
            <div className="p-3 bg-neutral-950/50 border border-amber-400/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold text-sm">
                  {currentPlayer.avatar || "P"}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-200">
                    {currentPlayer.username}
                  </p>
                  <p className="text-[10px] text-amber-400">You (Host)</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                Ready
              </span>
            </div>

            {/* Opponent - if joined */}
            {opponentJoined ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-400 text-black flex items-center justify-center font-bold text-sm">
                    {opponentJoined.avatar || "O"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-200">
                      {opponentJoined.username}
                    </p>
                    <p className="text-[10px] text-emerald-400">Opponent</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400">Ready</span>
              </motion.div>
            ) : (
              <div className="p-3 bg-neutral-950/50 border border-dashed border-white/10 rounded-lg flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600 animate-pulse" />
                <p className="text-[11px] text-gray-500">
                  Waiting for opponent to join...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Message */}
        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-[10px] text-blue-400 leading-relaxed">
            💡 Share this code with your opponent. They enter it in the "Join
            Room" field and click Join. The battle starts automatically when
            both players are ready!
          </p>
        </div>

        {/* Start Game Button */}
        <button
          onClick={onGameStart}
          disabled={!opponentJoined}
          className={`w-full py-3 font-bold rounded-lg transition-all text-sm uppercase font-mono tracking-wider ${
            opponentJoined
              ? "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-[0.98]"
              : "bg-gray-600 text-gray-300 cursor-not-allowed opacity-50"
          }`}
        >
          {opponentJoined ? "⚡ START BATTLE NOW" : "Waiting for Opponent..."}
        </button>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
