import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Trophy, Zap, Volume2, X, Star } from "lucide-react";
import { problems as clientProblems } from "../data/problems";

interface GiftBoxOverlayProps {
  difficulty: "Easy" | "Medium" | "Hard";
  onClose: () => void;
  onLaunchChallenge: (difficulty: "Easy" | "Medium" | "Hard", isPractice: boolean, problemId: string) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

export default function GiftBoxOverlay({ difficulty, onClose, onLaunchChallenge }: GiftBoxOverlayProps) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Sound hook function (sound-ready architecture)
  const playSound = (type: "click" | "burst") => {
    try {
      // Developers can link actual asset paths here
      // const audio = new Audio(type === "burst" ? "/sounds/burst.mp3" : "/sounds/click.mp3");
      // audio.volume = 0.4;
      // audio.play();
      console.log(`[AUDIO_LOG] Play matching sound queue: "${type}"`);
    } catch (e) {
      // Silent catch to prevent errors in sandboxed iframe
    }
  };

  // Generate particles for confetti burst
  const generateBurstParticles = () => {
    const colors = ["#FBBF24", "#F59E0B", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#FFFFFF"];
    const temp: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 80 + Math.random() * 180;
      temp.push({
        id: i,
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity - 30, // shift slightly upwards
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 12,
        rotation: Math.random() * 360,
      });
    }
    setParticles(temp);
  };

  const handleOpenBox = () => {
    if (opened || loading) return;
    playSound("click");
    setLoading(true);

    // Initial delays, then burst
    setTimeout(() => {
      playSound("burst");
      setOpened(true);
      generateBurstParticles();
      
      // Random number from 1 to 100
      const challengeNum = Math.floor(Math.random() * 100) + 1;
      setRandomNumber(challengeNum);
      setLoading(false);

      // Filter local problems by appropriate difficulty to select matching challenge ID
      const validProblems = clientProblems.filter((p) => p.difficulty === difficulty);
      const chosenProblem = validProblems.length > 0 
        ? validProblems[(challengeNum - 1) % validProblems.length] 
        : clientProblems[0];

      // Wait 3.5 seconds to appreciate the complete luxury animation then load
      setTimeout(() => {
        onLaunchChallenge(difficulty, false, chosenProblem.id);
      }, 3500);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden font-sans">
      
      {/* Cinematic Golden Light Rays Background */}
      <div className="absolute inset-x-0 top-1/4 bottom-1/4 flex items-center justify-center pointer-events-none opacity-40">
        <div className={`w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[80px] transition-all duration-1000 ${opened ? "scale-150 bg-amber-500/20" : ""}`} />
        <div className="absolute w-[2px] h-[600px] bg-gradient-to-t from-transparent via-amber-400/20 to-transparent animate-[spin_20s_linear_infinite]" />
        <div className="absolute w-[2px] h-[600px] bg-gradient-to-t from-transparent via-amber-400/25 to-transparent rotate-45 animate-[spin_25s_linear_infinite]" />
        <div className="absolute w-[2px] h-[600px] bg-gradient-to-t from-transparent via-amber-400/20 to-transparent rotate-90 animate-[spin_30s_linear_infinite]" />
      </div>

      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950/80 p-8 text-center flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative z-10 backdrop-blur-xl">
        
        {/* Head Close button */}
        {!opened && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Badgify */}
        <div className="flex flex-col gap-1 items-center">
          <span className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1 rounded-full font-bold shadow-md border ${
            difficulty === "Easy" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
            difficulty === "Medium" ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
            "bg-red-500/10 border-red-500/30 text-red-500"
          }`}>
            🔑 {difficulty} Quiz Challenge
          </span>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
            Mystery Loot Box
          </h2>
          <p className="text-xs text-gray-400 max-w-xs leading-normal">
            A randomized puzzle ID is locked inside. Click the floating box to unleash your challenge!
          </p>
        </div>

        {/* The Premium 3D Gift Box Centerpiece */}
        <div className="h-64 w-full flex items-center justify-center relative my-4">
          <AnimatePresence>
            {!opened ? (
              /* Floating, rotating gift box layout */
              <motion.div
                id="unopened_gift_box"
                onClick={handleOpenBox}
                animate={loading ? { 
                  scale: [1, 1.1, 0.9, 1.1, 0.9, 1.05],
                  rotate: [0, -10, 10, -10, 10, 0]
                } : { 
                  y: [0, -15, 0],
                  rotateY: [0, 15, -15, 0]
                }}
                transition={loading ? {
                  duration: 0.5,
                  repeat: Infinity
                } : {
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                  rotateY: { duration: 7, repeat: Infinity, ease: "easeInOut" }
                }}
                whileHover={{ scale: 1.08 }}
                className="relative cursor-pointer group flex flex-col items-center justify-center"
              >
                {/* Gold Outer Glow Backdrop */}
                <div className="absolute w-44 h-44 rounded-full bg-amber-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* 3D simulated Box Structure */}
                <div className="relative w-36 h-36 flex flex-col justify-end items-center">
                  
                  {/* Shadow Underneath Box */}
                  <div className="absolute bottom-1 w-24 h-4 bg-black/60 rounded-full blur-[6px] tracking-normal pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                  {/* Gift Lid Component */}
                  <motion.div 
                    className="absolute z-20 w-40 h-10 bg-amber-400 rounded-t-xl shadow-lg border-b border-amber-500 flex items-center justify-center"
                    style={{ bottom: "56px" }}
                  >
                    {/* Golden Star Accent */}
                    <Star className="w-5 h-5 text-zinc-950 fill-zinc-950 animate-pulse" />
                    {/* Ribbon Cross */}
                    <div className="absolute inset-y-0 w-6 bg-red-600 shadow-inner" />
                  </motion.div>

                  {/* Gift Box Base Cube */}
                  <div className="w-36 h-20 bg-amber-500 rounded-b-2xl relative shadow-[inset_0_-8px_16px_rgba(0,0,0,0.3)] border-t border-amber-400 flex items-center justify-center overflow-hidden">
                    {/* Ribbon Strip */}
                    <div className="absolute inset-y-0 w-6 bg-red-600 shadow-inner" />
                    {/* Accent border lines */}
                    <div className="absolute inset-0 border border-white/10 rounded-b-2xl" />
                  </div>

                  {/* Little particles emitting while floating */}
                  <div className="absolute -top-6 -right-4 animate-bounce">
                    <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300/20 opacity-80" />
                  </div>
                  <div className="absolute -bottom-2 -left-6 animate-pulse delay-75">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400/20 opacity-75" />
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Opened / Exploded Golden light overlay state */
              <div className="relative w-full h-full flex items-center justify-center">
                
                {/* Glow Explosion Flare */}
                <motion.div
                  initial={{ scale: 0.1, opacity: 0 }}
                  animate={{ scale: [1, 2, 1.8], opacity: [0, 1, 0.4] }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute w-44 h-44 rounded-full bg-amber-400/30 blur-2xl pointer-events-none"
                />

                {/* Flying Lid Animation */}
                <motion.div
                  initial={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
                  animate={{ y: -180, rotate: -35, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="absolute z-30 w-36 h-9 bg-amber-400 rounded-lg border-b border-amber-500 flex items-center justify-center shadow-2xl pointer-events-none"
                  style={{ top: "40px" }}
                >
                  <div className="absolute inset-y-0 w-5 bg-red-600" />
                </motion.div>

                {/* Flying Box Bottom Animation */}
                <motion.div
                  initial={{ y: 0, opacity: 1, scale: 1 }}
                  animate={{ y: 80, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 1.1, ease: "easeIn" }}
                  className="absolute w-32 h-18 bg-amber-500 rounded-b-xl relative border-t border-amber-400 pointer-events-none"
                  style={{ bottom: "40px" }}
                >
                  <div className="absolute inset-y-0 w-5 bg-red-600" />
                </motion.div>

                {/* Majestic Floating Random Number display */}
                <motion.div
                  initial={{ scale: 0.2, rotate: -15, opacity: 0 }}
                  animate={{ scale: [1.3, 1, 1.1], rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 100 }}
                  className="z-10 flex flex-col items-center justify-center p-6 rounded-2xl bg-amber-400 text-black border border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.5)] font-mono"
                >
                  <span className="text-[10px] uppercase tracking-widest font-bold text-black/70 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Target Challenge
                  </span>
                  <span className="text-5xl font-black tracking-tighter my-1">
                    #{randomNumber}
                  </span>
                  <div className="text-[10px] font-bold text-stone-900 border-t border-stone-800/10 pt-1.5 mt-1">
                    LOADING EXCLUSIVE ARENA...
                  </div>
                </motion.div>

                {/* Confetti Explosion Burst particles */}
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                    animate={{ 
                      x: p.x, 
                      y: p.y, 
                      rotate: p.rotation, 
                      opacity: 0,
                      scale: 0.3
                    }}
                    transition={{ duration: 1.8, ease: "easeOut" }}
                    className="absolute rounded"
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      transform: `rotate(${p.rotation}deg)`,
                      boxShadow: `0 0 10px ${p.color}55`
                    }}
                  />
                ))}

                {/* Additional floating stars surrounding the number */}
                {[...Array(6)].map((_, idx) => (
                  <motion.div
                    key={`star-${idx}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      scale: [0.5, 1.2, 0.5],
                      x: (Math.sin(idx) * 90) + (Math.random() * 20 - 10),
                      y: (Math.cos(idx) * 90) + (Math.random() * 20 - 10)
                    }}
                    transition={{ duration: 2.2, delay: 0.5 + (idx * 0.1), repeat: Infinity }}
                    className="absolute text-amber-300"
                  >
                    <Star className="w-4 h-4 fill-amber-300" />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Click Instruction Label */}
        <div className="flex flex-col gap-1 items-center">
          <AnimatePresence>
            {!opened ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1.5"
              >
                <motion.button
                  id="gift_click_here_btn"
                  onClick={handleOpenBox}
                  disabled={loading}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-neutral-950 font-black tracking-widest text-xs uppercase shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                  Click Here
                </motion.button>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                  Sound Ready Entrance
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-amber-400 font-mono font-bold tracking-widest flex items-center gap-1.5 justify-center uppercase"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
                Awaiting server synchronization...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
