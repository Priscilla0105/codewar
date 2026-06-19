import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VsPlayer {
  id?: string; // Made optional - will auto-generate if missing
  username: string;
  avatar?: string;
  rating: number;
  level?: number;
}

interface VsScreenProps {
  player1: VsPlayer;
  player2: VsPlayer;
  difficulty: "Easy" | "Medium" | "Hard";
  onAnimationComplete: () => void;
}

const AVATAR_EMOJIS = ["🦊","🐯","🦁","🐉","🦅","🐺","🦋","🔥","⚡","🌊","🎯","💎","🚀","🧠","👑"];

const DIFF_COLORS = {
  Easy:   { main: "#22c55e", glow: "rgba(34,197,94,.8)",   label: "EASY TIER" },
  Medium: { main: "#f59e0b", glow: "rgba(245,158,11,.8)",  label: "MEDIUM TIER" },
  Hard:   { main: "#ef4444", glow: "rgba(239,68,68,.8)",   label: "HARD TIER" },
};

// ─── Lightning Canvas ─────────────────────────────────────────────────────────
function LightningCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; 
    canvas.height = H;
    let raf: number;

    const drawBolt = (sx: number, sy: number, ex: number, ey: number, roughness: number, color: string, alpha: number) => {
      if (roughness < 2) {
        ctx.beginPath(); 
        ctx.moveTo(sx, sy); 
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = color; 
        ctx.globalAlpha = alpha; 
        ctx.lineWidth = roughness < 1 ? 0.5 : 1.5; 
        ctx.stroke(); 
        ctx.globalAlpha = 1;
        return;
      }
      const mx = (sx+ex)/2 + (Math.random()-0.5)*roughness*2;
      const my = (sy+ey)/2 + (Math.random()-0.5)*roughness*2;
      drawBolt(sx,sy,mx,my,roughness/2,color,alpha);
      drawBolt(mx,my,ex,ey,roughness/2,color,alpha);
    };

    let frame = 0;
    const CX = W/2, CY = H/2;
    
    const tick = () => {
      frame++;
      ctx.clearRect(0,0,W,H);
      
      if (frame % 3 === 0) {
        const count = 6 + Math.floor(Math.random()*6);
        for (let i=0; i<count; i++) {
          const angle = Math.random()*Math.PI*2;
          const dist = 80 + Math.random()*180;
          const ex = CX + Math.cos(angle)*dist;
          const ey = CY + Math.sin(angle)*dist;
          const colors = ["#f59e0b","#fbbf24","#ffffff","#6366f1"];
          drawBolt(CX, CY, ex, ey, 30+Math.random()*30, colors[Math.floor(Math.random()*colors.length)], 0.4+Math.random()*0.5);
          
          // branch
          if (Math.random() > 0.6) {
            const bx = ex + (Math.random()-0.5)*60;
            const by = ey + (Math.random()-0.5)*60;
            drawBolt(ex, ey, bx, by, 15, "#fbbf24", 0.2+Math.random()*0.3);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    
    tick();
    
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{zIndex:5}} />;
}

// ─── Particle Burst ──────────────────────────────────────────────────────────
function ParticleCanvas({ burst }: { burst: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; 
    canvas.height = H;
    let raf: number;

    if (burst) {
      const CX = W/2, CY = H/2;
      for (let i=0; i<200; i++) {
        const angle = Math.random()*Math.PI*2;
        const speed = 2 + Math.random()*12;
        const colors = ["#f59e0b","#fbbf24","#ef4444","#6366f1","#22c55e","#ffffff","#ff6b35"];
        particles.current.push({
          x: CX, 
          y: CY, 
          vx: Math.cos(angle)*speed, 
          vy: Math.sin(angle)*speed - Math.random()*5,
          r: 2+Math.random()*4, 
          a: 1, 
          c: colors[Math.floor(Math.random()*colors.length)], 
          decay: 0.015+Math.random()*0.02,
          gravity: 0.12, 
          shimmer: Math.random()>0.5
        });
      }
    }

    const tick = () => {
      ctx.clearRect(0,0,W,H);
      particles.current = particles.current.filter(p => p.a > 0);
      particles.current.forEach(p => {
        p.x += p.vx; 
        p.y += p.vy; 
        p.vy += p.gravity; 
        p.vx *= 0.98; 
        p.a -= p.decay;
        
        if (p.shimmer) { 
          ctx.shadowBlur = 6; 
          ctx.shadowColor = p.c; 
        }
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.c; 
        ctx.globalAlpha = Math.max(0, p.a); 
        ctx.fill();
        ctx.shadowBlur = 0; 
        ctx.globalAlpha = 1;
      });
      raf = requestAnimationFrame(tick);
    };
    
    tick();
    
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [burst]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{zIndex:6}} />;
}

// ─── Player Card in VS Screen ─────────────────────────────────────────────────
function VsPlayerCard({ 
  player, 
  side, 
  phase, 
  diffColor 
}: {
  player: VsPlayer; 
  side: "left" | "right"; 
  phase: number; 
  diffColor: string;
}) {
  const isEmoji = AVATAR_EMOJIS.includes(player.avatar || "");
  const fromX = side === "left" ? -150 : 150;

  return (
    <motion.div
      initial={{ x: fromX, opacity: 0 }}
      animate={{ x: 0, opacity: phase >= 1 ? 1 : 0 }}
      transition={{ duration: 0.7, type: "spring", bounce: 0.3, delay: side === "left" ? 0.1 : 0.2 }}
      className="flex flex-col items-center gap-4 relative"
    >
      {/* Glow backing */}
      <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20 pointer-events-none"
        style={{background: `radial-gradient(circle,${diffColor},transparent)`}} />

      {/* Avatar */}
      <motion.div
        animate={phase >= 2 ? {
          boxShadow: [`0 0 30px ${diffColor}`, `0 0 80px ${diffColor}`, `0 0 30px ${diffColor}`],
          scale: [1, 1.05, 1]
        } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 flex items-center justify-center relative"
        style={{
          borderColor: diffColor,
          background: isEmoji ? "linear-gradient(135deg,#1a1a2e,#16213e)" : `linear-gradient(135deg,${diffColor}40,${diffColor}20)`,
          boxShadow: `0 0 40px ${diffColor}60`,
        }}
      >
        <span className={isEmoji ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl font-black"} style={{color: isEmoji ? undefined : diffColor}}>
          {isEmoji ? player.avatar : (player.username[0] || "?").toUpperCase()}
        </span>
        
        {/* Orbit ring */}
        <motion.div 
          className="absolute inset-0 rounded-full border border-amber-400/20 pointer-events-none"
          animate={{rotate: 360}} 
          transition={{duration: 6, repeat: Infinity, ease:"linear"}}
          style={{margin:"-10px"}}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400/60" />
        </motion.div>
      </motion.div>

      {/* Name */}
      <div className="text-center flex flex-col gap-1">
        <motion.h2
          initial={{opacity:0,y:10}} 
          animate={{opacity: phase>=1?1:0, y: phase>=1?0:10}}
          transition={{delay:0.5}}
          className="text-lg md:text-2xl font-black uppercase tracking-widest"
          style={{fontFamily:"'Rajdhani','Space Grotesk',sans-serif", color:"#fff", textShadow:`0 0 20px ${diffColor}`}}
        >
          {player.username}
        </motion.h2>
        
        <motion.div 
          initial={{opacity:0}} 
          animate={{opacity: phase>=1?1:0}} 
          transition={{delay:0.7}}
          className="flex items-center justify-center gap-2 text-xs"
        >
          <span className="font-mono font-bold" style={{color:diffColor}}>⚡ {player.rating} ELO</span>
          {player.level && <span className="text-gray-400 font-mono">LVL {player.level}</span>}
        </motion.div>
      </div>

      {/* Vertical accent bar */}
      <motion.div
        initial={{scaleY:0}} 
        animate={{scaleY: phase>=1?1:0}} 
        transition={{delay:0.4,duration:0.5}}
        className="absolute bottom-0 w-1 h-16 rounded-full opacity-60"
        style={{background:`linear-gradient(to bottom,${diffColor},transparent)`,
          [side === "left" ? "right" : "left"]: "-20px"}} />
    </motion.div>
  );
}

// ─── Main VS Screen ──────────────────────────────────────────────────────────
export default function VsScreen({ 
  player1, 
  player2, 
  difficulty, 
  onAnimationComplete 
}: VsScreenProps) {
  const [phase, setPhase] = useState(0);
  const [showVs, setShowVs] = useState(false);
  const [burst, setBurst] = useState(false);
  const [lightning, setLightning] = useState(false);
  const [shake, setShake] = useState(false);
  const [diffLabel, setDiffLabel] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const dc = DIFF_COLORS[difficulty];

  useEffect(() => {
    // Phase timeline
    const t1 = setTimeout(() => setPhase(1), 400);           // players slide in
    const t2 = setTimeout(() => setShowVs(true), 1100);      // VS appears
    const t3 = setTimeout(() => setLightning(true), 1200);   // lightning starts
    const t4 = setTimeout(() => setBurst(true), 1400);       // particle burst
    const t5 = setTimeout(() => setShake(true), 1400);       // screen shake
    const t6 = setTimeout(() => setShake(false), 1700);
    const t7 = setTimeout(() => setPhase(2), 1600);          // glow pulses
    const t8 = setTimeout(() => setDiffLabel(true), 2000);   // diff label
    const t9 = setTimeout(() => setLightning(false), 2800);  // lightning ends
    const t10 = setTimeout(() => setCountdown(3), 3000);
    const t11 = setTimeout(() => setCountdown(2), 3800);
    const t12 = setTimeout(() => setCountdown(1), 4600);
    const t13 = setTimeout(() => { 
      setCountdown(null); 
      onAnimationComplete(); 
    }, 5400);

    return () => {
      [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13].forEach(clearTimeout);
    };
  }, [onAnimationComplete]);

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{background:"#000", fontFamily:"'Rajdhani','Space Grotesk',sans-serif", zIndex:100}}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Space+Grotesk:wght@400;700&display=swap');
        @keyframes vs-shake { 
          0%,100%{transform:translate(0)} 
          20%{transform:translate(-6px,3px)} 
          40%{transform:translate(6px,-3px)} 
          60%{transform:translate(-4px,4px)} 
          80%{transform:translate(4px,-2px)} 
        }
        @keyframes bg-scan { 
          0%{transform:translateY(-100%)} 
          100%{transform:translateY(100vh)} 
        }
        @keyframes vs-glow { 
          0%,100%{text-shadow:0 0 40px #f59e0b,0 0 80px #f59e0b} 
          50%{text-shadow:0 0 80px #fff,0 0 160px #f59e0b,0 0 200px #f59e0b} 
        }
        .vs-shake { animation: vs-shake .35s ease-out; }
        .vs-glow { animation: vs-glow 1s ease-in-out infinite; }
        @keyframes countdown-pop { 
          0%{transform:scale(2);opacity:0} 
          40%{transform:scale(.9);opacity:1} 
          60%{transform:scale(1.05)} 
          100%{transform:scale(1);opacity:1} 
        }
        .count-pop { animation: countdown-pop .4s cubic-bezier(.175,.885,.32,1.275) forwards; }
        @keyframes energy-beam { 
          0%{width:0;opacity:0} 
          30%{opacity:1} 
          100%{width:50%;opacity:0} 
        }
        .energy-beam-l { animation: energy-beam .6s ease-out forwards; transform-origin:right; }
        .energy-beam-r { animation: energy-beam .6s ease-out forwards; transform-origin:left; transform:scaleX(-1); }
      `}</style>

      {/* Animated background grid */}
      <div className="absolute inset-0" style={{zIndex:1}}>
        {/* radial glow */}
        <div className="absolute inset-0" style={{background:`radial-gradient(ellipse 60% 50% at 50% 50%,${dc.main}15,transparent 70%)`}} />
        
        {/* grid */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="vs-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke={dc.main} strokeWidth=".5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#vs-grid)"/>
        </svg>
        
        {/* scan line */}
        <div className="absolute left-0 right-0 h-[2px] opacity-30" style={{background:`linear-gradient(90deg,transparent,${dc.main},transparent)`,animation:"bg-scan 3s linear infinite"}} />
      </div>

      <ParticleCanvas burst={burst} />
      <LightningCanvas active={lightning} />

      {/* Main content */}
      <div className={`relative z-10 w-full max-w-5xl px-4 flex items-center justify-between gap-4 md:gap-8 ${shake ? "vs-shake" : ""}`}>

        {/* Player 1 */}
        <div className="flex-1 flex justify-end">
          <VsPlayerCard player={player1} side="left" phase={phase} diffColor={dc.main} />
        </div>

        {/* VS Center */}
        <div className="flex flex-col items-center gap-4 relative flex-shrink-0" style={{minWidth:120}}>

          {/* Energy beams (horizontal) */}
          <AnimatePresence>
            {showVs && (
              <>
                <div className="absolute top-1/2 right-full h-[2px] w-0 energy-beam-l"
                  style={{background:`linear-gradient(to left,${dc.main},transparent)`, marginTop:"-1px"}} />
                <div className="absolute top-1/2 left-full h-[2px] w-0 energy-beam-r"
                  style={{background:`linear-gradient(to right,${dc.main},transparent)`, marginTop:"-1px"}} />
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showVs && (
              <motion.div
                initial={{scale: 3, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                transition={{duration: 0.5, type:"spring", bounce:0.4}}
                className="flex flex-col items-center gap-3"
              >
                {/* VS Logo */}
                <div className="relative">
                  <span className="vs-glow text-6xl md:text-8xl font-black select-none"
                    style={{
                      fontFamily:"'Rajdhani',sans-serif",
                      letterSpacing:".02em",
                      background:`linear-gradient(180deg,#fff 0%,${dc.main} 60%)`,
                      WebkitBackgroundClip:"text", 
                      WebkitTextFillColor:"transparent",
                      filter:`drop-shadow(0 0 20px ${dc.main})`,
                    }}>
                    VS
                  </span>
                  {/* Cross lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[1px] opacity-40" style={{background:`linear-gradient(90deg,transparent,${dc.main},transparent)`}} />
                  </div>
                </div>

                {/* Difficulty badge */}
                <AnimatePresence>
                  {diffLabel && (
                    <motion.div 
                      initial={{opacity:0,y:10}} 
                      animate={{opacity:1,y:0}} 
                      transition={{duration:0.4}}
                      className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest font-mono border"
                      style={{color:dc.main, borderColor:`${dc.main}50`, background:`${dc.main}15`,
                        boxShadow:`0 0 20px ${dc.main}40`}}>
                      {dc.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Countdown */}
          <AnimatePresence mode="wait">
            {countdown !== null && (
              <motion.div 
                key={countdown}
                initial={{scale:1.8, opacity:0}} 
                animate={{scale:1, opacity:1}} 
                exit={{scale:0.5,opacity:0}}
                transition={{duration:0.3, type:"spring"}}
                className="text-5xl md:text-7xl font-black"
                style={{fontFamily:"'Rajdhani',sans-serif", color:"#fff",
                  textShadow:`0 0 40px ${dc.main}, 0 0 80px ${dc.main}`}}>
                {countdown}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player 2 */}
        <div className="flex-1 flex justify-start">
          <VsPlayerCard player={player2} side="right" phase={phase} diffColor={dc.main} />
        </div>
      </div>

      {/* Bottom strip */}
      <AnimatePresence>
        {showVs && (
          <motion.div 
            initial={{opacity:0,y:20}} 
            animate={{opacity:1,y:0}} 
            transition={{delay:0.5}}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
            <div className="h-[1px] w-16 opacity-40" style={{background:`linear-gradient(to right,transparent,${dc.main})`}} />
            <span className="text-[10px] uppercase tracking-[.3em] font-mono font-bold" style={{color:dc.main}}>
              BATTLE COMMENCING
            </span>
            <div className="h-[1px] w-16 opacity-40" style={{background:`linear-gradient(to left,transparent,${dc.main})`}} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
