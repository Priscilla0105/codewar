import React from "react";
import { User } from "../types";
import { Zap, Swords, ChevronRight, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import FuturisticBackground from "./FuturisticBackground";

interface LandingPageProps {
  user: User | null;
  onEnterBattle: () => void;
  onShowAuth: () => void;
  onSignOut: () => void;
}

export default function LandingPage({ user, onEnterBattle, onShowAuth, onSignOut }: LandingPageProps) {
  return (
    <div id="landing_page_viewport" className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col font-sans">
      
      {/* Premium Cinematic 3D Animated Background */}
      <FuturisticBackground />
      
      {/* Background visual elements */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute -top-12 -left-12 w-96 h-96 bg-amber-600/5 blur-3xl rounded-full pointer-events-none"></div>

      {/* 🚀 TOP NAVIGATION BAR */}
      <header className="w-full z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/[0.04] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Logo Badge Container */}
          <div className="w-9 h-9 bg-amber-400 font-bold text-black border border-amber-300 rounded-lg flex items-center justify-center text-lg shadow-[0_0_10px_rgba(245,158,11,0.30)]">
            C
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Clash of Codes
          </span>
        </div>

        {/* Dynamic Auth Actions Navigation */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs text-amber-400 font-mono font-bold">🛡️ ELO {user.stats.rating}</span>
                <span className="text-[10px] text-gray-400">Welcome, {user.username}</span>
              </div>
              <button
                id="sign_out_btn"
                onClick={onSignOut}
                className="px-4 py-1.5 rounded-lg border border-white/10 hover:border-red-500/30 text-xs font-semibold hover:bg-red-500/10 transition-all cursor-pointer text-gray-300"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                id="sign_in_nav_btn"
                onClick={onShowAuth}
                className="px-4 py-1.5 rounded-lg border border-white/10 hover:border-amber-400 text-xs font-semibold bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer text-gray-300"
              >
                Sign In
              </button>
              <button
                id="enroll_free_nav_btn"
                onClick={onShowAuth}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-black hover:opacity-90 transition-all font-bold cursor-pointer shadow-[0_0_15px_rgba(246,211,101,0.25)]"
              >
                Enroll Free
              </button>
            </>
          )}
        </div>
      </header>

      {/* ⚔️ CORE HERO ELEMENTS SECTION */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 text-center max-w-5xl mx-auto z-10 w-full relative">
        
        {/* Call compilers header status indicator */}
        <div className="mb-8 flex justify-center items-center">
          <div className="px-4 py-1.5 bg-neutral-900/80 border border-amber-500/20 text-amber-400 text-[10px] tracking-widest uppercase font-mono rounded-full font-semibold flex items-center gap-1.5 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.08)]">
            <Zap className="w-3 h-3 fill-amber-400" />
            1v1 Live Battle Compilers Online
          </div>
        </div>

        {/* 🎨 CALIGRAPHY SCRIPT GOLD "Code War" TITLE WITH CINEMATIC LEFT-TO-RIGHT INTRO */}
        <div className="select-none mb-6 relative overflow-visible flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, x: -70, filter: "blur(15px) brightness(1.8)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px) brightness(1)" }}
            transition={{
              duration: 1.6,
              ease: [0.16, 1, 0.3, 1] // Apple-smooth cinematic ease-out
            }}
            className="relative flex flex-col items-center justify-center"
          >
            {/* Soft background ambient flare behind text */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.35, 0.25], scale: [0.8, 1.15, 1] }}
              transition={{ delay: 0.1, duration: 2.0, ease: "easeOut" }}
              className="absolute inset-x-0 -inset-y-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 blur-[28px] rounded-full -z-10"
            />
            
           <h1
  className="py-2 leading-none relative select-none"
  style={{
    fontFamily: "'Alex Brush', cursive",
    fontSize: "clamp(5rem, 10vw, 10rem)",
    color: "#ffffff",
    letterSpacing: "2px",
    textShadow:
      "0 0 5px #fff, 0 0 15px #fff, 0 0 35px rgba(255,255,255,0.8)"
  }}
>
  Code War
</h1>

            {/* Glowing gold underline that sweeps from left to right */}
            <div className="w-full relative mt-[-6px]">
              {/* Core underline filament */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  delay: 0.3,
                  duration: 1.5,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="h-[2px] w-[180px] sm:w-[240px] md:w-[320px] mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent relative z-10 origin-left"
              />
              {/* Wide neon glow underline aura */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: [0, 0.7, 0.45] }}
                transition={{
                  delay: 0.4,
                  duration: 1.9,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="absolute inset-x-0 top-0 h-[5px] w-[180px] sm:w-[240px] md:w-[320px] mx-auto bg-gradient-to-r from-transparent via-amber-400/50 to-transparent blur-[4px] origin-left"
              />
            </div>
          </motion.div>
        </div>

        {/* Dynamic subtext guidelines */}
        <h2 className="text-gray-400 text-xs sm:text-sm tracking-[0.22em] uppercase max-w-2xl mx-auto leading-relaxed mb-4 font-mono font-medium">
          Level-Based 1v1 Battle Arena for Developers
        </h2>

        <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed mb-10 font-sans tracking-wide">
          Select Difficulty Easy, Medium & Hard <span className="text-amber-400 mx-1">•</span> Solve
          Problems <span className="text-amber-400 mx-1">•</span> Earn ELO.
        </p>

        {/* Glow CTA Match matchmaking button trigger */}
        <button
          id="enter_battle_cta_btn"
          onClick={onEnterBattle}
          className="group relative px-10 py-4 font-bold text-black border-2 border-amber-300 rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:opacity-95 text-sm sm:text-base tracking-widest uppercase transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.35)]"
        >
          <span className="flex items-center gap-2">
            Enter To Battle
            <ChevronRight className="w-5 h-5 text-black group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>

        {/* Lower screen metric statistics anchors */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-white/[0.04] grid grid-cols-2 gap-8 sm:gap-14 w-full max-w-lg mx-auto">
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1 font-mono">300+</span>
            <span className="text-[10px] tracking-[0.15em] text-gray-500 uppercase font-bold">Problems</span>
          </div>
          <div className="flex flex-col items-center border-l border-white/[0.05]">
            <span className="text-sm sm:text-base font-bold tracking-wide text-amber-400 mb-1 font-mono">100 / Tier</span>
            <span className="text-[10px] tracking-[0.1em] text-gray-500 uppercase font-mono font-bold flex gap-1.5 items-center">
              <span>Easy</span>
              <span className="text-gray-700">•</span>
              <span>Med</span>
              <span className="text-gray-700">•</span>
              <span>Hard</span>
            </span>
          </div>
        </div>

      </main>

      {/* Ground system status */}
      <footer className="w-full text-center text-[10px] text-gray-600 font-mono py-4 border-t border-white/[0.02]">
        © 2026 Clash Of Coders Portal. All code compilation runs fully isolated.
      </footer>
    </div>
  );
}
