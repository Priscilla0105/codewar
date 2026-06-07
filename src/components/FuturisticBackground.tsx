import React, { useEffect, useRef } from "react";

export default function FuturisticBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Global timeline index for automatic kinematic oscillation
    let time = 0;

    // Responsive setup
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Automatic Cinematic Volumetric Blobs (Breathing luxury dark-orange environment)
    const blobs = [
      { baseX: 0.15, baseY: 0.25, r: 400, color: "rgba(245, 158, 11, 0.075)", speed: 0.4 },
      { baseX: 0.85, baseY: 0.75, r: 500, color: "rgba(251, 191, 36, 0.055)", speed: 0.3 },
      { baseX: 0.5, baseY: 0.45, r: 600, color: "rgba(120, 53, 4, 0.12)", speed: 0.2 },
      { baseX: 0.75, baseY: 0.2, r: 350, color: "rgba(217, 119, 6, 0.045)", speed: 0.5 },
    ];

    // Automatic Golden Float particles
    const particles: {
      x: number;
      y: number;
      speedY: number;
      driftSpeed: number;
      driftRange: number;
      size: number;
      alpha: number;
      scaleSpeed: number;
    }[] = [];

    const maxParticles = 45;
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: -(Math.random() * 0.35 + 0.15),
        driftSpeed: Math.random() * 0.002 + 0.001,
        driftRange: Math.random() * 1.5 + 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.2,
        scaleSpeed: Math.random() * 0.005 + 0.002,
      });
    }

    // High fidelity Cyber Code Symbols
    const symbolsText = ["</>", "{}", "=>", "&&", "[]", "const", "let", "01", "+=", "fn", "db", "async", "await"];
    const symbols: {
      x: number;
      y: number;
      speedY: number;
      driftSpeed: number;
      text: string;
      size: number;
      alpha: number;
      rotation: number;
      rotationSpeed: number;
      baseAlpha: number;
    }[] = [];

    const symbolCount = 12;
    for (let i = 0; i < symbolCount; i++) {
      const baseAlpha = Math.random() * 0.14 + 0.06;
      symbols.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: -(Math.random() * 0.2 + 0.1),
        driftSpeed: Math.random() * 0.001 + 0.0005,
        text: symbolsText[Math.floor(Math.random() * symbolsText.length)],
        size: Math.floor(Math.random() * 10) + 11,
        alpha: baseAlpha,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.004,
        baseAlpha,
      });
    }

    // Concentric Energy Pulse Rings
    const energyRings = [
      { r: 0, speed: 1.2, maxR: 450, alpha: 0 },
      { r: 150, speed: 1.2, maxR: 450, alpha: 0 },
      { r: 300, speed: 1.2, maxR: 450, alpha: 0 },
    ];

    // Constant solid background fill to avoid artifacts
    ctx.fillStyle = "#030303";
    ctx.fillRect(0, 0, width, height);

    // Dynamic Render Loop
    const render = () => {
      time += 0.01;

      // Dark futuristic overlay gradient trail
      ctx.fillStyle = "rgba(4, 4, 4, 1)";
      ctx.fillRect(0, 0, width, height);

      // 1. DYNAMIC NEON FOG / VOLUMETRIC BACKGROUND GRADIENTS (Automatic breathing)
      blobs.forEach((b, idx) => {
        // High-end trigonometric orbit calculations
        const radOscValue = Math.sin(time * b.speed + idx) * 80;
        const xOscValue = Math.cos(time * b.speed * 0.7 + idx) * 120;

        const posX = width * b.baseX + xOscValue;
        const posY = height * b.baseY + radOscValue;
        const currentRadius = b.r + Math.sin(time * b.speed) * 40;

        const gradient = ctx.createRadialGradient(posX, posY, 0, posX, posY, currentRadius);
        gradient.addColorStop(0, b.color);
        gradient.addColorStop(0.4, "rgba(245, 158, 11, 0.015)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(posX, posY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. AAA STADIUM-STYLE ROTATING LIGHT BEAMS (Slow dynamic projection)
      const beamCount = 3;
      for (let i = 0; i < beamCount; i++) {
        const offset = i * (Math.PI / 1.5);
        const projectionAngle = Math.PI / 2 + Math.sin(time * 0.25 + offset) * 0.35; // sweep angle
        const startX = width * (0.25 + i * 0.25);
        const startY = -40;
        const beamLength = height * 1.5;

        const endX1 = startX + Math.cos(projectionAngle - 0.08) * beamLength;
        const endY1 = startY + Math.sin(projectionAngle - 0.08) * beamLength;
        const endX2 = startX + Math.cos(projectionAngle + 0.08) * beamLength;
        const endY2 = startY + Math.sin(projectionAngle + 0.08) * beamLength;

        const beamGrad = ctx.createLinearGradient(startX, startY, startX + Math.cos(projectionAngle) * height, startY + Math.sin(projectionAngle) * height);
        const beamAlpha = (0.05 + Math.sin(time * 0.5 + i) * 0.02);
        beamGrad.addColorStop(0, `rgba(245, 158, 11, ${beamAlpha})`);
        beamGrad.addColorStop(0.5, `rgba(251, 191, 36, ${beamAlpha * 0.35})`);
        beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX1, endY1);
        ctx.lineTo(endX2, endY2);
        ctx.closePath();
        ctx.fill();
      }

      // 3. PERSPECTIVE CYBER GRID SCROLLING FIELD (AAA visual feel wireframe)
      const vanishingPointX = width / 2;
      const vanishingPointY = height * 0.32; // Horizon wireframe height
      
      ctx.strokeStyle = "rgba(245, 158, 11, 0.04)";
      ctx.lineWidth = 1;

      // Draw horizontal scrolling line dividers
      const linesCount = 14;
      const gridProgress = (time * 18) % 40; // auto speed factor scroll
      for (let i = 0; i < linesCount; i++) {
        // Perspective curve calculations mapping spacing exponentially
        const normY = Math.pow((i + gridProgress / 40) / linesCount, 2.5); // exponential vertical curve
        const gridY = vanishingPointY + (height - vanishingPointY) * normY;

        ctx.beginPath();
        ctx.moveTo(0, gridY);
        ctx.lineTo(width, gridY);
        ctx.stroke();
      }

      // Draw vertical vanishing lines outward
      const perspectiveRays = 18;
      for (let i = 0; i <= perspectiveRays; i++) {
        const angleNorm = i / perspectiveRays;
        const targetX = width * 2.5 * (angleNorm - 0.5) + width / 2; // Fan out wide

        ctx.beginPath();
        // Cut ray slightly below horizon for modern futuristic crop look
        ctx.moveTo(vanishingPointX, vanishingPointY + 8);
        ctx.lineTo(targetX, height);
        ctx.stroke();
      }

      // Horizon glow line separator
      ctx.strokeStyle = "rgba(245, 158, 11, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.2, vanishingPointY + 4);
      ctx.lineTo(width * 0.8, vanishingPointY + 4);
      ctx.stroke();

      // Flat horizon glowing nebula line
      const horizonGrad = ctx.createLinearGradient(width * 0.2, vanishingPointY, width * 0.8, vanishingPointY);
      horizonGrad.addColorStop(0, "rgba(245, 158, 11, 0)");
      horizonGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.15)");
      horizonGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = horizonGrad;
      ctx.fillRect(0, vanishingPointY + 1, width, 5);

      // 4. ANIMATED BREATHING ENERGY PULSE RINGS
      energyRings.forEach((r) => {
        r.r += r.speed;
        if (r.r > r.maxR) {
          r.r = 0;
        }

        // Pulse alpha starts near center, flares up, then decays to zero at boundaries
        const rRatio = r.r / r.maxR;
        r.alpha = Math.sin(rRatio * Math.PI) * 0.08;

        ctx.strokeStyle = `rgba(251, 191, 36, ${r.alpha})`;
        ctx.lineWidth = 1 + (1 - rRatio) * 1.5;

        // Project loop into a flattened 3D oval to align with perspective grid
        ctx.beginPath();
        ctx.ellipse(vanishingPointX, vanishingPointY + (height - vanishingPointY) * 0.5, r.r, r.r * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inside soft accent ray
        ctx.strokeStyle = `rgba(245, 158, 11, ${r.alpha * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(vanishingPointX, vanishingPointY + (height - vanishingPointY) * 0.5, r.r * 0.85, r.r * 0.85 * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 5. FLOATING GOLDEN PARTICLES (Sinusoidal automatic lateral swing)
      particles.forEach((p) => {
        p.y += p.speedY;
        // Float side to side automatically using sine vectors
        p.x += Math.sin(time * p.driftSpeed * 10) * p.driftRange * 0.18;

        // Reset particle to bottom if it flies off top
        if (p.y < -15) {
          p.y = height + 15;
          p.x = Math.random() * width;
        }

        // Elegant fade glow using dynamic sine
        const particlePulse = Math.sin(time * p.scaleSpeed * 10) * 0.2 + 0.85;

        ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * particlePulse})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * particlePulse, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow aura
        ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha * 0.15 * particlePulse})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. CYBERNETIC FLOATING SYMBOLS
      symbols.forEach((s) => {
        s.y += s.speedY;
        s.x += Math.sin(time * s.driftSpeed * 8) * 0.22;
        s.rotation += s.rotationSpeed;

        if (s.y < -25) {
          s.y = height + 25;
          s.x = Math.random() * width;
        }

        const alphaPulse = Math.sin(time * 0.8 + s.size) * 0.05 + s.baseAlpha;
        ctx.font = `bold ${s.size}px var(--font-mono)`;
        ctx.fillStyle = `rgba(245, 158, 11, ${alphaPulse})`;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.fillText(s.text, 0, 0);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none z-0"
      style={{ mixBlendMode: "screen", opacity: 0.95 }}
    />
  );
}

