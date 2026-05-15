"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const COLORS = [
  "139,92,246",   // violet
  "79,143,255",   // blue
  "168,85,247",   // purple
  "236,72,153",   // pink
  "6,182,212",    // cyan
  "255,255,255",  // white
];

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create stars
    const starCount = Math.min(Math.floor((w * h) / 5000), 250);
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.8 + 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    starsRef.current = stars;

    const shootingStars: ShootingStar[] = [];
    shootingStarsRef.current = shootingStars;

    // Mouse tracking
    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);

    let time = 0;

    const animate = () => {
      time += 1;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Spawn shooting stars occasionally
      if (Math.random() < 0.003) {
        const startX = Math.random() * w;
        shootingStars.push({
          x: startX,
          y: 0,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * 6 + 4,
          life: 0,
          maxLife: 60 + Math.random() * 40,
          size: Math.random() * 2 + 1,
        });
      }

      // Draw shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life++;
        const progress = ss.life / ss.maxLife;
        const alpha = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;

        // Trail
        const trailLen = 20;
        const gradient = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - ss.vx * trailLen, ss.y - ss.vy * trailLen
        );
        gradient.addColorStop(0, `rgba(168,85,247,${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(168,85,247,0)`);
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * trailLen, ss.y - ss.vy * trailLen);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = ss.size;
        ctx.stroke();

        // Head glow
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.fill();

        if (ss.life >= ss.maxLife) shootingStars.splice(i, 1);
      }

      // Update & draw stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Mouse repulsion
        const dx = star.x - mx;
        const dy = star.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 150;

        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius;
          star.vx += (dx / dist) * force * 0.3;
          star.vy += (dy / dist) * force * 0.3;
        }

        // Drift
        star.x += star.vx;
        star.y += star.vy;

        // Friction
        star.vx *= 0.99;
        star.vy *= 0.99;

        // Wrap
        if (star.x < -10) star.x = w + 10;
        if (star.x > w + 10) star.x = -10;
        if (star.y < -10) star.y = h + 10;
        if (star.y > h + 10) star.y = -10;

        // Twinkle
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        const finalOpacity = star.opacity * twinkle;

        // Draw star glow
        const glowSize = star.radius * 4;
        const glow = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, glowSize
        );
        glow.addColorStop(0, `rgba(${star.color},${finalOpacity * 0.3})`);
        glow.addColorStop(1, `rgba(${star.color},0)`);
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Draw star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${finalOpacity})`;
        ctx.fill();
      }

      // Draw constellation lines between nearby stars
      const connectionDist = 120;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Mouse glow area - brighter constellation near cursor
      if (mx > 0 && my > 0) {
        const mouseGlowRadius = 200;
        for (let i = 0; i < stars.length; i++) {
          const dx = stars[i].x - mx;
          const dy = stars[i].y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseGlowRadius) {
            for (let j = i + 1; j < stars.length; j++) {
              const dx2 = stars[j].x - mx;
              const dy2 = stars[j].y - my;
              const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

              if (dist2 < mouseGlowRadius) {
                const starDx = stars[i].x - stars[j].x;
                const starDy = stars[i].y - stars[j].y;
                const starDist = Math.sqrt(starDx * starDx + starDy * starDy);

                if (starDist < mouseGlowRadius * 1.2) {
                  const alpha = (1 - starDist / (mouseGlowRadius * 1.2)) * 0.25;
                  const closeness = 1 - Math.max(dist, dist2) / mouseGlowRadius;
                  ctx.beginPath();
                  ctx.moveTo(stars[i].x, stars[i].y);
                  ctx.lineTo(stars[j].x, stars[j].y);
                  ctx.strokeStyle = `rgba(168,85,247,${alpha * closeness})`;
                  ctx.lineWidth = 0.8;
                  ctx.stroke();
                }
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
}
