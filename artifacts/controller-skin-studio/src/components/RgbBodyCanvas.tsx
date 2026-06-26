import { useRef, useEffect } from "react";

export type RgbBodyMode = "wave" | "breathing";

interface Props {
  maskUrl: string;
  speed: number;       // seconds per cycle, roughly — higher = slower
  mode: RgbBodyMode;
  intensity: number;   // 0 - 1, scales brightness/contrast of the effect
  color: string;        // hex color used when rainbow is off
  rainbow: boolean;     // true = cycle through hues, false = use `color`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Standalone controller-body RGB silhouette canvas.
// Wave = continuous full-bright hue sweep, Breathing = full-bright color that
// cycles hue while pulsing (never drops to fully dark/blank). Designed to
// show solid color through any real transparent cutouts in lattice/vented
// skins with no blank gaps — unlike the MKB keyboard's RgbCanvas styles,
// which dim to near-zero at points (fine for a soft glow behind solid art,
// not fine for a skin with actual holes in it). Clipped to a pre-baked glow
// mask (controller body shape, shrunk inward — see
// public/skins/*-rgb-glow-mask.png). Positioned behind the controller art.
// Fully separate from BodyEffectOverlay (fire/pulseGlow/particles) and from
// the MKB RgbCanvas — no shared state with either.
export function RgbBodyCanvas({ maskUrl, speed, mode, intensity, color, rainbow }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);

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
          tRef.current += 0.016 * ss;
          const t = tRef.current;
          const w = canvas.width, h = canvas.height;
          if (w > 0 && h > 0) {
            ctx.clearRect(0, 0, w, h);

            if (mode === "breathing") {
              // Full-bright color that cycles hue over time while pulsing in/out.
              // Floor keeps it from ever going fully blank/dark.
              const raw = 0.5 + 0.5 * Math.sin(t * 2.5);
              const pulse = 0.3 + 0.7 * raw; // dim floor, never transparent
              const hue = rainbow ? t * 0.08 : 0;
              ctx.fillStyle = getC(hue, intensity * pulse);
              ctx.fillRect(0, 0, w, h);
            } else {
              // Wave — smoothly blended hue bands scrolling across the canvas,
              // with a continuous brightness pulse layered on top (never drops
              // to transparent). Uses a triangle-wave hue path (rather than a
              // sawtooth that snaps from 360° back to 0°) so there are no hard
              // color-reversal seams — the blend stays continuous everywhere.
              const repeats = 1;
              const pulseRaw = 0.5 + 0.5 * Math.sin(t * 3);
              const pulse = 0.25 + 0.75 * pulseRaw; // wider dim-to-bright swing, never transparent
              const grad = ctx.createLinearGradient(0, 0, w, 0);
              const steps = 120;
              for (let i = 0; i <= steps; i++) {
                const frac = i / steps;
                const phase = frac * repeats + t * 0.18;
                // Triangle wave: smoothly ping-pongs 0→1→0 instead of jumping
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

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        display: "block",
        WebkitMaskImage: `url("${maskUrl}")`,
        maskImage: `url("${maskUrl}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
