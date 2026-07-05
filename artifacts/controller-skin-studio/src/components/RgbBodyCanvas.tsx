import { useRef, useEffect } from "react";
import type React from "react";

export type RgbBodyMode = "wave" | "breathing";

interface Props {
  maskUrl: string;
  speed: number;       // seconds per cycle, roughly — higher = slower
  mode: RgbBodyMode;
  intensity: number;   // 0 - 1, scales brightness/contrast of the effect
  color: string;       // hex color used when rainbow is off
  rainbow: boolean;    // true = cycle through hues, false = use `color`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Standalone controller-body RGB silhouette canvas.
// Wave = continuous full-bright hue sweep, Breathing = full-bright color that
// cycles hue while pulsing (never drops to fully dark/blank).
// Clipped to a pre-baked glow mask (controller body shape — see
// public/skins/*-rgb-glow-mask.png). Positioned behind the controller art.
// Fully separate from BodyEffectOverlay (fire/pulseGlow/particles) and from
// the MKB RgbCanvas — no shared state with either.
export function RgbBodyCanvas({ maskUrl, speed, mode, intensity, color, rainbow }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef     = useRef(0); // scaled clock

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let started = false;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width;
      canvas.height = height;
      if (!started && width > 0 && height > 0) {
        started = true;
        const ss = 1 / Math.max(speed, 0.5);
        const [rr, rg, rb] = hexToRgb(color);
        const getC = (hue: number, alpha: number) =>
          rainbow ? `hsla(${((hue * 360) % 360 + 360) % 360},100%,55%,${alpha})`
                  : `rgba(${rr},${rg},${rb},${alpha})`;

        const tick = () => {
          tRef.current  += 0.016 * ss;
          const t  = tRef.current;
          const w = canvas.width, h = canvas.height;
          if (w > 0 && h > 0) {
            ctx.clearRect(0, 0, w, h);

            if (mode === "breathing") {
              const raw = 0.5 + 0.5 * Math.sin(t * 2.5);
              const pulse = 0.55 + 0.45 * raw;
              const hue = rainbow ? t * 0.08 : 0;
              ctx.fillStyle = getC(hue, intensity * pulse);
              ctx.fillRect(0, 0, w, h);

            } else {
              // wave
              const repeats = 1;
              const pulseRaw = 0.5 + 0.5 * Math.sin(t * 3);
              const pulse = 0.55 + 0.45 * pulseRaw;
              const grad = ctx.createLinearGradient(0, 0, w, 0);
              const steps = 120;
              for (let i = 0; i <= steps; i++) {
                const frac = i / steps;
                const phase = frac * repeats + t * 0.18;
                const tri = Math.abs(((phase % 1) + 1) % 1 * 2 - 1);
                const hue = rainbow ? tri : 0;
                grad.addColorStop(frac, getC(hue, intensity * pulse));
              }
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, w, h);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    });

    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [speed, mode, intensity, color, rainbow]);

  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `url("${maskUrl}")`,
    maskImage: `url("${maskUrl}")`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  return (
    <>
      {/* Solid black backing — same mask as the RGB canvas. Ensures the RGB
          fades to black rather than transparent, so the effect looks opaque
          and colors read correctly against any background. */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ ...maskStyle, backgroundColor: "black" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: "block", ...maskStyle }}
      />
    </>
  );
}
