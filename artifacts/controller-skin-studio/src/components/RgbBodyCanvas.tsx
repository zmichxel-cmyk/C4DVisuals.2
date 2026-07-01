import { useRef, useEffect } from "react";
import type React from "react";

export type RgbBodyMode = "wave" | "breathing" | "reactive";

interface Props {
  maskUrl: string;
  speed: number;       // seconds per cycle, roughly — higher = slower
  mode: RgbBodyMode;
  intensity: number;   // 0 - 1, scales brightness/contrast of the effect
  color: string;       // hex color used when rainbow is off
  rainbow: boolean;    // true = cycle through hues, false = use `color`
  // Reactive mode only — button press positions as % of canvas (0-100)
  pressedButtons?: Set<number>;
  buttonPositions?: Record<number, { x: number; y: number }>;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Standalone controller-body RGB silhouette canvas.
// Wave = continuous full-bright hue sweep, Breathing = full-bright color that
// cycles hue while pulsing (never drops to fully dark/blank). Reactive = ripples
// expand outward from wherever each button is pressed, following override positions.
// Clipped to a pre-baked glow mask (controller body shape — see
// public/skins/*-rgb-glow-mask.png). Positioned behind the controller art.
// Fully separate from BodyEffectOverlay (fire/pulseGlow/particles) and from
// the MKB RgbCanvas — no shared state with either.
export function RgbBodyCanvas({ maskUrl, speed, mode, intensity, color, rainbow, pressedButtons, buttonPositions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef     = useRef(0); // scaled clock (wave/breathing)
  const realTRef = useRef(0); // unscaled real-time clock (reactive ripples)

  // Reactive mode — live refs so the RAF tick always reads latest values
  // without needing to restart the animation loop on every button change.
  const pressedRef    = useRef<Set<number>>(new Set());
  const prevPressedRef= useRef<Set<number>>(new Set());
  const btnPosRef     = useRef<Record<number, { x: number; y: number }>>({});
  const ripplesRef    = useRef<{ cx: number; cy: number; startT: number }[]>([]);

  // Keep reactive refs in sync with props each render
  useEffect(() => { pressedRef.current = pressedButtons ?? new Set(); }, [pressedButtons]);
  useEffect(() => { btnPosRef.current  = buttonPositions ?? {};        }, [buttonPositions]);

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
          realTRef.current += 0.016; // always advances at real-time rate (~16ms/frame)
          const t  = tRef.current;
          const rt = realTRef.current;
          const w = canvas.width, h = canvas.height;
          if (w > 0 && h > 0) {
            ctx.clearRect(0, 0, w, h);

            if (mode === "breathing") {
              const raw = 0.5 + 0.5 * Math.sin(t * 2.5);
              const pulse = 0.3 + 0.7 * raw;
              const hue = rainbow ? t * 0.08 : 0;
              ctx.fillStyle = getC(hue, intensity * pulse);
              ctx.fillRect(0, 0, w, h);

            } else if (mode === "wave") {
              const repeats = 1;
              const pulseRaw = 0.5 + 0.5 * Math.sin(t * 3);
              const pulse = 0.25 + 0.75 * pulseRaw;
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

            } else {
              // ── Reactive — ripples expand from each button press location ──
              // Ripple lifetime in real seconds. Speed slider repurposed:
              // lower speed = snappier ripple, higher = longer travel.
              const rippleLife = Math.max(speed, 0.5) * 0.22;

              // Expire old ripples
              ripplesRef.current = ripplesRef.current.filter(r => rt - r.startT < rippleLife);

              // Detect newly pressed buttons this frame
              const cur  = pressedRef.current;
              const prev = prevPressedRef.current;
              for (const idx of cur) {
                if (!prev.has(idx)) {
                  const pos = btnPosRef.current[idx];
                  if (pos) {
                    ripplesRef.current.push({
                      cx: (pos.x / 100) * w,
                      cy: (pos.y / 100) * h,
                      startT: rt,
                    });
                  }
                }
              }
              prevPressedRef.current = new Set(cur);

              // Draw each ripple as an expanding translucent ring
              for (const rip of ripplesRef.current) {
                const age       = rt - rip.startT;
                const frac      = age / rippleLife;
                const radius    = frac * Math.max(w, h) * 1.3;
                const thickness = Math.max(w, h) * 0.07;
                const alpha     = Math.max(0, (1 - frac) * intensity);
                const hue       = rainbow ? (age * 0.4 + rip.cx / w) % 1 : 0;

                const inner = Math.max(0, radius - thickness);
                const outer = radius + thickness;
                const grd = ctx.createRadialGradient(rip.cx, rip.cy, inner, rip.cx, rip.cy, outer);
                grd.addColorStop(0,   getC(hue, 0));
                grd.addColorStop(0.3, getC(hue, alpha * 0.5));
                grd.addColorStop(0.5, getC(hue, alpha));
                grd.addColorStop(0.7, getC(hue, alpha * 0.5));
                grd.addColorStop(1,   getC(hue, 0));
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, w, h);
              }
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
