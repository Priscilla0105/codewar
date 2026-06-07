import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [startReveal, setStartReveal] = useState(false);
  const [displayedLength, setDisplayedLength] = useState(0);

  const titleText = "Clash Of Coders";
  const charArray = Array.from(titleText);

  // Setup cinematic canvas particles & ambient visual landscape
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let animationFrameId: number;
    let time = 0;

    // Responsive window sizing
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Luxury floating silver/white cinematic dust
    const silverParticles: {
      x: number;
      y: number;
      speedY: number;
      driftSpeed: number;
      size: number;
      alpha: number;
      maxAlpha: number;
      angle: number;
    }[] = [];

    const totalParticles = 45;
    for (let i = 0; i < totalParticles; i++) {
      const maxAlpha = Math.random() * 0.45 + 0.15;
      silverParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: -(Math.random() * 0.22 + 0.08),
        driftSpeed: Math.random() * 0.0018 + 0.0006,
        size: Math.random() * 2 + 0.8,
        alpha: 0, // Fade-in at start
        maxAlpha,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Volumetric subtle gradient glow blocks (simulating silver cinematic smoke)
    const volumetricGlows = [
      { xPct: 0.5, yPct: 0.5, baseRadius: 320, color: "rgba(255, 255, 255, 0.045)", speed: 0.8 },
      { xPct: 0.3, yPct: 0.4, baseRadius: 260, color: "rgba(203, 213, 225, 0.035)", speed: 0.5 },
      { xPct: 0.7, yPct: 0.6, baseRadius: 290, color: "rgba(255, 255, 255, 0.025)", speed: 0.6 },
    ];

    // Loop
    const render = () => {
      time += 0.01;

      // Pure theatrical cinematic black background
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      // 1. ANIME SUBTLE CINEMATIC BACKGROUND GLOWS (Silver/White vignette breathing)
      volumetricGlows.forEach((glow, index) => {
        const bounce = Math.sin(time * glow.speed + index) * 35;
        const radius = glow.baseRadius + bounce;
        const gradient = ctx.createRadialGradient(
          width * glow.xPct,
          height * glow.yPct,
          0,
          width * glow.xPct,
          height * glow.yPct,
          radius
        );
        gradient.addColorStop(0, glow.color);
        gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.005)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(width * glow.xPct, height * glow.yPct, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. LUXURY FLOATING CINEMATIC SILVER/WHITE PARTICLES (Drifting dust)
      silverParticles.forEach((p) => {
        p.y += p.speedY;
        p.angle += p.driftSpeed;
        p.x += Math.sin(p.angle) * 0.18;

        // Smooth initial fade-in loop
        if (p.alpha < p.maxAlpha) {
          p.alpha += 0.005;
        }

        // Boundary recycling
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
          p.alpha = 0;
        }

        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
        radGrad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        radGrad.addColorStop(0.3, `rgba(226, 232, 240, ${p.alpha * 0.4})`);
        radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Thin decorative horizon lines deep behind text (Silver look)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(width, height * 0.5);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Stagger text trigger for beautiful sequence pacing
    const textTimer = setTimeout(() => {
      setStartReveal(true);
    }, 600);

    // Fade and transition automatic timers (extended to allow complete luxury typing + soft glow loop)
    const finalCompleteTimer = setTimeout(() => {
      onComplete();
    }, 4800);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      clearTimeout(textTimer);
      clearTimeout(finalCompleteTimer);
    };
  }, [onComplete]);

  // Real character-by-character progressive typing scanner
  useEffect(() => {
    if (!startReveal) return;

    let currentLength = 0;
    const typingInterval = setInterval(() => {
      currentLength += 1;
      setDisplayedLength(currentLength);
      
      if (currentLength >= titleText.length) {
        clearInterval(typingInterval);
      }
    }, 180); // 180ms typing step speed

    return () => clearInterval(typingInterval);
  }, [startReveal]);

  const typingFinished = displayedLength >= titleText.length;

  return (
    <div 
      id="cinematic_intro_title_card" 
      className="fixed inset-0 bg-[#020202] flex flex-col justify-center items-center z-[9999] overflow-hidden select-none"
    >
      {/* Background cinematic particles landscape */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />

      {/* Volumetric center spot aura */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#020202]/95 pointer-events-none z-10" />

      {/* Main Title Padded Card */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-6">
        <AnimatePresence>
          {startReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{
                  filter: typingFinished 
                    ? "drop-shadow(0 0 28px rgba(255, 255, 255, 0.75)) brightness(1.15)" 
                    : "drop-shadow(0 0 10px rgba(255, 255, 255, 0.3)) brightness(1.0)"
                }}
                transition={{
                  duration: 1.4,
                  ease: "easeOut"
                }}
                className="flex flex-wrap justify-center items-center gap-y-2 relative"
              >
                {/* Staggered progressive characters */}
                {charArray.map((char, index) => {
                  const isRevealed = index < displayedLength;
                  return (
                    <React.Fragment key={index}>
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7, y: 5 }}
                        animate={
                          isRevealed 
                            ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px) brightness(1)" } 
                            : { opacity: 0, scale: 0.7, y: 5, filter: "blur(10px) brightness(1.8)" }
                        }
                        transition={{
                          duration: 0.45,
                          ease: "easeOut"
                        }}
                        className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-cursive leading-none py-3 tracking-wide select-none ${
                          char === " " ? "mr-4 sm:mr-6 lg:mr-8" : "text-silver-cursive-shimmer"
                        }`}
                        style={{
                          fontFamily: "'Alex Brush', cursive",
                        }}
                      >
                        {char}
                      </motion.span>

                      {/* Moving active typing cursor follows immediate last rendered word character */}
                      {index === displayedLength - 1 && !typingFinished && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="text-white font-sans text-5xl sm:text-6xl md:text-7xl lg:text-8xl ml-1 leading-none inline-block relative select-none"
                          style={{
                            textShadow: "0 0 15px rgba(255, 255, 255, 0.9)",
                            top: "-0.08em"
                          }}
                        >
                          |
                        </motion.span>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Initial cursor position if no letters are typed yet */}
                {displayedLength === 0 && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-white font-sans text-5xl sm:text-6xl md:text-7xl lg:text-8xl ml-1 leading-none inline-block relative select-none"
                    style={{
                      textShadow: "0 0 15px rgba(255, 255, 255, 0.9)",
                      top: "-0.08em"
                    }}
                  >
                    |
                  </motion.span>
                )}
                
                {/* Secondary silver shine cinema sweep light animation overlay */}
                <motion.div
                  initial={{ left: "-45%", opacity: 0 }}
                  animate={typingFinished ? { left: "145%", opacity: [0, 0.4, 0] } : {}}
                  transition={{
                    delay: 0.3,
                    duration: 1.6,
                    ease: "easeInOut",
                  }}
                  className="absolute top-0 bottom-0 w-1/4 bg-white/20 skew-x-[-22deg] blur-[32px] z-20 pointer-events-none"
                />
              </motion.div>

              {/* Cinematic Underline Reveal */}
              <div className="w-full relative mt-[-2px] sm:mt-[-4px]">
                {/* Underline horizontal reveal */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={typingFinished ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={{
                    delay: 0.2,
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1] // Elegant ease out
                  }}
                  className="h-[2px] w-[260px] sm:w-[400px] md:w-[500px] lg:w-[650px] mx-auto bg-gradient-to-r from-transparent via-white to-transparent relative z-10 origin-center"
                />
                
                {/* Underline matching pure white/silver aura glow */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={typingFinished ? { scaleX: 1, opacity: [0, 0.65, 0.45] } : { scaleX: 0, opacity: 0 }}
                  transition={{
                    delay: 0.4,
                    duration: 1.5,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="absolute inset-x-0 top-0 h-[4px] w-[260px] sm:w-[400px] md:w-[500px] lg:w-[650px] mx-auto bg-gradient-to-r from-transparent via-white/60 to-transparent blur-[5px] origin-center"
                />
              </div>

              {/* Subtitle or atmospheric micro-element */}
              <motion.span
                initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={typingFinished ? { opacity: 0.45, y: 0, filter: "blur(0px)" } : {}}
                transition={{ delay: 0.7, duration: 0.9 }}
                className="text-[10px] uppercase font-mono tracking-[0.25em] text-slate-300 font-bold mt-5 sm:mt-7"
              >
                THE COMPETITIVE ARENA
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic widescreen top / bottom letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-4 sm:h-8 bg-black z-30" />
      <div className="absolute bottom-0 left-0 right-0 h-4 sm:h-8 bg-black z-30" />
    </div>
  );
}
