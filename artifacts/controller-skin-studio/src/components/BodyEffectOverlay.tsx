import { useRef, useEffect } from "react";

export type BodyEffectType = "none" | "pulseGlow" | "particles" | "fire" | "reactive" | "reactiveReverse" | "particleBurst" | "reactiveFire";

interface Props {
  effect: BodyEffectType;
  speed: number;
  intensity: number;
  maskUrl: string;
  glowColor: string;
  fireColor2?: string;
  fireGlowSpeed?: number;
  fireEmberSpeed?: number;
  // Reactive ripple mode
  pressedButtons?: Set<number>;
  buttonPositions?: Record<number, { x:number; y:number; size:number; shape:string; maskSw?:number; maskSh?:number; skinAspect?:number }>;
  reactiveColor?: string;
  reactiveRainbow?: boolean;
}

function makeCanvas(maskUrl: string): React.CSSProperties {
  return {
    position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
    WebkitMaskImage: `url("${maskUrl}")`, maskImage: `url("${maskUrl}")`,
    WebkitMaskSize: "contain", maskSize: "contain",
    WebkitMaskPosition: "center", maskPosition: "center",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    mixBlendMode: "screen" as const,
  };
}

function makeUnmaskedCanvas(): React.CSSProperties {
  return {
    position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
    mixBlendMode: "screen" as const,
  };
}

function hexToHsl(hex: string): [number, number, number] {
  if (!hex.startsWith("#") || hex.length !== 7) return [270, 80, 55];
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  if (max === min) return [0, 0, l*100];
  const d = max - min, s = l > 0.5 ? d/(2-max-min) : d/(max+min);
  let h = max === r ? (g-b)/d+(g<b?6:0) : max === g ? (b-r)/d+2 : (r-g)/d+4;
  return [h*60, s*100, l*100];
}

// Returns [halfWidth, halfHeight] of the button's visual press area in canvas pixels.
// For circle/pill/cross buttons hw=hh=(size/200)*w (uniform radius in all directions).
// For rect (touchpad), uses the buttonMask sw/sh percentages which define the actual
// visual extent of the press indicator — giving exact edge per direction when combined
// with the rectEdgeR formula: min(hw/|cosθ|, hh/|sinθ|).
function buttonHWHH(
  pos: { size:number; shape:string; maskSw?:number; maskSh?:number; skinAspect?:number },
  w: number
): [number, number] {
  if (pos.shape === "rect" && pos.maskSw != null && pos.maskSh != null && pos.skinAspect != null) {
    const hw = (pos.maskSw / 200) * w;
    const hh = (pos.maskSh / 200) * (w * pos.skinAspect);
    return [hw, hh];
  }
  const r = (pos.size / 200) * w;
  return [r, r];
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle Burst — types and generator
// A one-shot explosion spawned along the pressed button's edge. Position is a
// closed-form function of age (exponentially-decaying velocity, no per-frame
// mutable state) with an added perpendicular jitter term for organic wander.
// Sizes/drag are drawn from weighted tiers — spark/ember/chunk — the same
// trick the fire embers use to avoid every particle looking identical.
// Velocity is derived from a target travel distance (maxDist = v0/drag)
// scaled to canvas size, rather than picked independently of drag — otherwise
// faster tiers just brake harder and every tier caps out at nearly the same
// tiny radius regardless of controller size, which is why the burst was
// hanging around the button instead of shooting outward.
// ─────────────────────────────────────────────────────────────────────────────
type BurstParticle = {
  x0:number; y0:number; angle:number; vx:number; vy:number;
  size:number; drag:number; hueOff:number;
  jitterAmp:number; jitterFreq:number; jitterPhase:number;
  flickerSpeed:number; flickerPhase:number;
};
type BurstEvent = { startT:number; life:number; particles:BurstParticle[] };

function genBurstParticles(cx:number, cy:number, hw:number, hh:number, canvasMax:number, n:number): BurstParticle[] {
  const arr: BurstParticle[] = [];
  for (let i=0; i<n; i++) {
    // Most particles fan out evenly and stay close to the button. A minority
    // ("wild" ones) get both a wider random angle and extra travel distance,
    // so only some visibly rocket off further/more randomly — not all of them.
    const isWild = Math.random() < 0.22;
    let angle = (i/n)*Math.PI*2 + (Math.random()-0.5)*(Math.PI*2/n);
    if (isWild) angle += (Math.random()-0.5) * 1.6;

    const ca=Math.abs(Math.cos(angle)), sa=Math.abs(Math.sin(angle));
    const edgeR = ca < 1e-9 ? hh : sa < 1e-9 ? hw : Math.min(hw/ca, hh/sa);
    const x0 = cx + Math.cos(angle)*edgeR, y0 = cy + Math.sin(angle)*edgeR;

    // Weighted kind — small/fast, medium, or big/slow — for organic size variety
    const roll = Math.random();
    let size:number, maxDist:number, drag:number;
    if (roll < 0.35) {
      size = 0.8 + Math.random()*1.0;                      // spark — tiny, fast, snaps to a stop
      maxDist = canvasMax * (0.04 + Math.random()*0.05);
      drag = 3.0 + Math.random()*2.0;
    } else if (roll < 0.75) {
      size = 1.8 + Math.random()*2.2;                      // ember — standard
      maxDist = canvasMax * (0.06 + Math.random()*0.06);
      drag = 1.8 + Math.random()*1.4;
    } else {
      size = 3.2 + Math.random()*3.2;                      // chunk — big, slow, lingers
      maxDist = canvasMax * (0.09 + Math.random()*0.08);
      drag = 1.0 + Math.random()*0.8;
    }
    if (isWild) maxDist *= 1.8 + Math.random()*1.4;
    const speed = maxDist * drag;

    arr.push({
      x0, y0, angle, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      size, drag, hueOff: (i/n)*360 + Math.random()*30,
      jitterAmp: 4 + Math.random()*14,
      jitterFreq: 3 + Math.random()*6,
      jitterPhase: Math.random()*Math.PI*2,
      flickerSpeed: 2 + Math.random()*6,
      flickerPhase: Math.random()*Math.PI*2,
    });
  }
  return arr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic canvas hook — waits for real dimensions before starting tick
function useCanvas(
  active: boolean,
  deps: unknown[],
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
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
        const tick = () => {
          if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            draw(ctx, canvas.width, canvas.height);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    });

    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [active, ...deps]);

  return canvasRef;
}

export function BodyEffectOverlay({ effect, speed, intensity, maskUrl, glowColor, fireColor2 = "#ff8800", fireGlowSpeed = 4, fireEmberSpeed = 6, pressedButtons, buttonPositions, reactiveColor = "#ffffff", reactiveRainbow = true }: Props) {
  const ss = 1 / Math.max(speed, 0.5);

  // Reactive color refs — updated immediately so running tick loops pick up changes
  const hue1Ref = useRef(hexToHsl(glowColor));
  const hue2Ref = useRef(hexToHsl(fireColor2));
  useEffect(() => { hue1Ref.current = hexToHsl(glowColor); }, [glowColor]);
  useEffect(() => { hue2Ref.current = hexToHsl(fireColor2); }, [fireColor2]);

  // Raw hex color ref for pulse glow — avoids HSL instability with low-saturation colors
  const glowColorRef = useRef(glowColor);
  useEffect(() => { glowColorRef.current = glowColor; }, [glowColor]);

  // ── Reactive ripple refs ───────────────────────────────────────────────────
  const pressedRef      = useRef<Set<number>>(new Set());
  const prevPressedRef  = useRef<Set<number>>(new Set());
  const btnPosRef = useRef<Record<number, { x:number; y:number; size:number; shape:string; maskSw?:number; maskSh?:number; skinAspect?:number }>>({});
  const ripplesRef      = useRef<{ cx: number; cy: number; startT: number; edgeR: number }[]>([]);
  const reactRealTRef   = useRef(0);
  const reactColorRef   = useRef(reactiveColor);
  const reactRainbowRef = useRef(reactiveRainbow);

  useEffect(() => { pressedRef.current     = pressedButtons  ?? new Set(); }, [pressedButtons]);
  useEffect(() => { btnPosRef.current      = buttonPositions ?? {};         }, [buttonPositions]);
  useEffect(() => { reactColorRef.current  = reactiveColor;                 }, [reactiveColor]);
  useEffect(() => { reactRainbowRef.current = reactiveRainbow;              }, [reactiveRainbow]);

  // ── Particle Burst event store ─────────────────────────────────────────────
  const burstEventsRef = useRef<BurstEvent[]>([]);
  const burstTRef      = useRef(0);

  // ── Reactive Reverse event store ───────────────────────────────────────────
  const reverseRipplesRef  = useRef<{ cx:number; cy:number; startT:number; edgeR:number }[]>([]);
  const reverseRealTRef    = useRef(0);

  // ── Reactive Fire event store ──────────────────────────────────────────────
  const fireBurstEventsRef = useRef<{ cx:number; cy:number; startT:number; life:number; embers:RideEmber[] }[]>([]);
  const fireBurstTRef      = useRef(0);

  // Helper: hex color + alpha → rgba string
  function hexAlpha(hex: string, a: number): string {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ── Pulse Glow ────────────────────────────────────────────────────────────
  const tGlowRef = useRef(0);
  const glowRef = useCanvas(effect === "pulseGlow", [speed, intensity], (ctx, w, h) => {
    tGlowRef.current += 0.016 * ss;
    const pulse = (Math.sin(tGlowRef.current * Math.PI * 2) + 1) / 2;
    const col = glowColorRef.current;
    const edgeDepth = 0.28;
    const a1 = (0.55 + 0.45 * pulse) * intensity;
    const a2 = (0.2 + 0.15 * pulse) * intensity;

    function drawEdge(x0: number, y0: number, x1: number, y1: number) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0,   hexAlpha(col, a1));
      g.addColorStop(0.5, hexAlpha(col, a2));
      g.addColorStop(1,   hexAlpha(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    drawEdge(0, h, 0, h * (1 - edgeDepth));       // bottom
    drawEdge(0, 0, 0, h * edgeDepth);              // top
    drawEdge(0, 0, w * edgeDepth, 0);              // left
    drawEdge(w, 0, w * (1 - edgeDepth), 0);        // right
  });

  // Dummy ref so render section still works (glowOuterRef no longer used for pulseGlow)
  const tGlowOuterRef = useRef(0);
  const glowOuterRef = useCanvas(false, [speed, intensity], () => {});

  // ── Particles ─────────────────────────────────────────────────────────────
  type Particle = { x:number;y:number;vx:number;vy:number;r:number;hue:number;hueShift:number;life:number;maxLife:number;twinkle:number;twinkleSpeed:number;opacity:number };
  const pRef = useRef<Particle[]>([]);
  const sSP = 6 * ss;
  const particleRef = useCanvas(effect === "particles", [speed, intensity], (ctx, w, h) => {
    const target = Math.round(20 * intensity) + 15;
    while (pRef.current.length < target) {
      const angle = Math.random() * Math.PI * 2, spd = 0.1 + Math.random() * 0.7, ml = 80 + Math.random() * 220;
      pRef.current.push({ x:Math.random()*w, y:Math.random()*h, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-Math.random()*0.3, r:0.5+Math.random()*3.5, hue:Math.random()*360, hueShift:(Math.random()-0.5)*1.5, life:Math.random()*ml, maxLife:ml, twinkle:Math.random()*Math.PI*2, twinkleSpeed:0.02+Math.random()*0.08, opacity:0.4+Math.random()*0.6 });
    }
    if (pRef.current.length > target) pRef.current.length = target;
    for (let i = 0; i < pRef.current.length; i++) {
      const p = pRef.current[i];
      p.x += p.vx*sSP; p.y += p.vy*sSP; p.hue=(p.hue+p.hueShift*sSP)%360; p.life+=sSP; p.twinkle+=p.twinkleSpeed*sSP;
      if (p.x<-10) p.x=w+10; if (p.x>w+10) p.x=-10; if (p.y<-10) p.y=h+10; if (p.y>h+10) p.y=-10;
      if (p.life>=p.maxLife){ const a2=Math.random()*Math.PI*2,s2=0.1+Math.random()*0.7,ml2=80+Math.random()*220; pRef.current[i]={x:Math.random()*w,y:Math.random()*h,vx:Math.cos(a2)*s2,vy:Math.sin(a2)*s2-Math.random()*0.3,r:0.5+Math.random()*3.5,hue:Math.random()*360,hueShift:(Math.random()-0.5)*1.5,life:0,maxLife:ml2,twinkle:Math.random()*Math.PI*2,twinkleSpeed:0.02+Math.random()*0.08,opacity:0.4+Math.random()*0.6}; continue; }
      const lf=p.life/p.maxLife, fade=lf<0.15?lf/0.15:lf>0.75?1-(lf-0.75)/0.25:1, tw=(Math.sin(p.twinkle)+1)/2;
      const a=fade*p.opacity*(0.4+0.6*tw)*intensity;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(0.7+0.3*tw),0,Math.PI*2);
      ctx.fillStyle=`hsla(${p.hue},90%,70%,${a})`; ctx.shadowBlur=8+6*tw; ctx.shadowColor=`hsla(${p.hue},90%,65%,${a*0.8})`; ctx.fill();
    }
  });

  // ── Fire ──────────────────────────────────────────────────────────────────
  type EmberKind = "tiny" | "medium" | "large" | "line";
  type Ember = {
    x:number; y:number; vx:number; vy:number;
    r:number; life:number; maxLife:number;
    hue:number; sat:number;
    kind: EmberKind;
    flickerSpeed: number; flickerPhase: number;
    speed: number; // individual speed multiplier
  };
  const eRef = useRef<Ember[]>([]);
  const ssGlow = 1 / Math.max(fireGlowSpeed, 0.5);
  const ssEmber = 6 / Math.max(fireEmberSpeed, 0.5);

  function spawnEmber(w: number, h: number): Ember {
    const [hf1,sf1] = hue1Ref.current, [hf2,sf2] = hue2Ref.current;
    const useC1 = Math.random() < 0.6;
    const hue = useC1 ? hf1+(Math.random()-0.5)*20 : hf2+(Math.random()-0.5)*20;
    const sat = useC1 ? sf1 : sf2;

    // Pick a kind with weighted probability
    const roll = Math.random();
    let kind: EmberKind, r: number, spd: number, maxLife: number, flickerSpeed: number;
    if (roll < 0.30) {
      // tiny — very small, fast flickering, quick life
      kind = "tiny"; r = 0.4 + Math.random() * 0.8;
      spd = 0.3 + Math.random() * 1.2;
      maxLife = 20 + Math.random() * 50;
      flickerSpeed = 0.6 + Math.random() * 1.2;
    } else if (roll < 0.60) {
      // medium — standard ember
      kind = "medium"; r = 1.2 + Math.random() * 1.8;
      spd = 0.2 + Math.random() * 0.9;
      maxLife = 50 + Math.random() * 100;
      flickerSpeed = 0.2 + Math.random() * 0.5;
    } else if (roll < 0.80) {
      // large — big slow ember, slow flicker
      kind = "large"; r = 2.5 + Math.random() * 3.0;
      spd = 0.1 + Math.random() * 0.4;
      maxLife = 80 + Math.random() * 140;
      flickerSpeed = 0.05 + Math.random() * 0.15;
    } else {
      // line — thin streak
      kind = "line"; r = 0.5 + Math.random() * 1.0; // line half-width
      spd = 0.4 + Math.random() * 1.8;
      maxLife = 30 + Math.random() * 70;
      flickerSpeed = 0.3 + Math.random() * 0.8;
    }

    const angle = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.6;
    return {
      x: Math.random()*w, y: h*(0.65+Math.random()*0.35),
      vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd,
      r, life: 0, maxLife, hue, sat, kind,
      flickerSpeed, flickerPhase: Math.random()*Math.PI*2,
      speed: spd,
    };
  }

  // Ride embers stay locked to the wave's own expanding radius the whole
  // time — instead of independent velocity/buoyancy, each one just has a
  // fixed angle plus a small radial offset and a gentle wobble/bob, so it
  // visibly rides the outer edge of the fire wave as it's pushed outward
  // rather than flying off on its own separate trajectory.
  type RideEmber = {
    angle:number; radialOffset:number;
    wobbleAmp:number; wobbleFreq:number; wobblePhase:number;
    bobAmp:number; bobFreq:number; bobPhase:number;
    r:number; hue:number; sat:number; kind:EmberKind;
    flickerSpeed:number; flickerPhase:number; spd:number;
  };

  // Same kind weights/ranges as spawnEmber above (size/speed-character/flicker
  // per tiny/medium/large/line), but positioned relative to the wave's radius
  // instead of given independent velocity.
  function spawnRideEmber(index: number, n: number): RideEmber {
    const [hf1,sf1] = hue1Ref.current, [hf2,sf2] = hue2Ref.current;
    const useC1 = Math.random() < 0.6;
    const hue = useC1 ? hf1+(Math.random()-0.5)*20 : hf2+(Math.random()-0.5)*20;
    const sat = useC1 ? sf1 : sf2;

    const roll = Math.random();
    let kind: EmberKind, r: number, spd: number, flickerSpeed: number;
    if (roll < 0.30) {
      kind = "tiny"; r = 0.4 + Math.random() * 0.8;
      spd = 0.3 + Math.random() * 1.2;
      flickerSpeed = 0.6 + Math.random() * 1.2;
    } else if (roll < 0.60) {
      kind = "medium"; r = 1.2 + Math.random() * 1.8;
      spd = 0.2 + Math.random() * 0.9;
      flickerSpeed = 0.2 + Math.random() * 0.5;
    } else if (roll < 0.80) {
      kind = "large"; r = 2.5 + Math.random() * 3.0;
      spd = 0.1 + Math.random() * 0.4;
      flickerSpeed = 0.05 + Math.random() * 0.15;
    } else {
      kind = "line"; r = 0.5 + Math.random() * 1.0;
      spd = 0.4 + Math.random() * 1.8;
      flickerSpeed = 0.3 + Math.random() * 0.8;
    }

    const angle = (index/n)*Math.PI*2 + (Math.random()-0.5)*(Math.PI*2/n);
    return {
      angle,
      radialOffset: -0.03 + Math.random()*0.13,   // sits right around the wave's edge — a few slightly inside, most slightly outside
      wobbleAmp: 0.12 + Math.random()*0.3, wobbleFreq: 1+Math.random()*2, wobblePhase: Math.random()*Math.PI*2,
      bobAmp: 0.02 + Math.random()*0.04, bobFreq: 1.5+Math.random()*2.5, bobPhase: Math.random()*Math.PI*2,
      r, hue, sat, kind,
      flickerSpeed, flickerPhase: Math.random()*Math.PI*2, spd,
    };
  }

  // Same per-kind rendering as the ambient fire's embers, but position is
  // derived from the wave's current radius (R) each frame rather than
  // integrated from stored velocity — so the ember rides the wave's edge for
  // its entire visible lifetime instead of drifting independently.
  function updateAndDrawRideEmbers(ctx: CanvasRenderingContext2D, embers: RideEmber[], cx:number, cy:number, R:number, maxSpread:number, age:number, alpha:number, intensity:number) {
    for (let i = 0; i < embers.length; i++) {
      const em = embers[i];
      const emberAngle = em.angle + Math.sin(age*em.wobbleFreq + em.wobblePhase) * em.wobbleAmp;
      const emberR = R + em.radialOffset*maxSpread + Math.sin(age*em.bobFreq + em.bobPhase)*em.bobAmp*maxSpread;
      if (emberR < 1) continue;
      const px = cx + Math.cos(emberAngle)*emberR;
      const py = cy + Math.sin(emberAngle)*emberR;

      const flicker = (Math.sin(age * em.flickerSpeed*4 + em.flickerPhase) + 1) / 2;
      const a = alpha * intensity;
      if (a <= 0.01) continue;

      ctx.shadowBlur = 0;

      if (em.kind === "tiny") {
        const ta = a * (0.3 + 0.7 * flicker);
        ctx.beginPath();
        ctx.arc(px, py, em.r * (0.6 + 0.4*flicker), 0, Math.PI*2);
        ctx.fillStyle = `hsla(${em.hue},${em.sat}%,${85+10*flicker}%,${ta})`;
        ctx.shadowBlur = 4 + 8*flicker;
        ctx.shadowColor = `hsla(${em.hue},${em.sat}%,80%,${ta})`;
        ctx.fill();

      } else if (em.kind === "medium") {
        const ma = a * (0.4 + 0.6*flicker);
        ctx.beginPath();
        ctx.arc(px, py, em.r*(0.5+0.3*flicker), 0, Math.PI*2);
        ctx.fillStyle = `hsla(${em.hue},${em.sat}%,${75+20*flicker}%,${ma})`;
        ctx.shadowBlur = 5 + 5*flicker;
        ctx.shadowColor = `hsla(${em.hue},${em.sat}%,75%,${ma*0.8})`;
        ctx.fill();
        if (em.r > 1.5) {
          const ang = emberAngle; // radially outward — the ember's actual direction of travel
          ctx.save();
          ctx.translate(px - Math.cos(ang)*em.r*2.5, py - Math.sin(ang)*em.r*2.5);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.ellipse(0, 0, em.r*0.1, em.r*(0.5+0.4*flicker), 0, 0, Math.PI*2);
          ctx.fillStyle = `hsla(${em.hue},${em.sat}%,65%,${ma*0.25})`;
          ctx.fill();
          ctx.restore();
        }

      } else if (em.kind === "large") {
        const la = a * (0.25 + 0.4*flicker);
        const grd = ctx.createRadialGradient(px, py, 0, px, py, em.r*(1.2+0.4*flicker));
        grd.addColorStop(0,   `hsla(${em.hue},${em.sat}%,80%,${la})`);
        grd.addColorStop(0.5, `hsla(${em.hue},${em.sat}%,60%,${la*0.5})`);
        grd.addColorStop(1,   `hsla(${em.hue},${em.sat}%,40%,0)`);
        ctx.beginPath();
        ctx.arc(px, py, em.r*(1.2+0.4*flicker), 0, Math.PI*2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, em.r*0.35, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${em.hue},${em.sat}%,92%,${la*1.4})`;
        ctx.fill();

      } else {
        const la = a * (0.4 + 0.6*flicker);
        const ang = emberAngle; // radially outward — the ember's actual direction of travel
        const len = 6 + em.spd * 8 + flicker * 6;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        const sg = ctx.createLinearGradient(-len, 0, em.r*2, 0);
        sg.addColorStop(0,   `hsla(${em.hue},${em.sat}%,70%,0)`);
        sg.addColorStop(0.6, `hsla(${em.hue},${em.sat}%,80%,${la*0.6})`);
        sg.addColorStop(1,   `hsla(${em.hue},${em.sat}%,95%,${la})`);
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(em.r*2, 0);
        ctx.strokeStyle = sg;
        ctx.lineWidth = em.r * (0.6 + 0.6*flicker);
        ctx.lineCap = "round";
        ctx.shadowBlur = 4 + 6*flicker;
        ctx.shadowColor = `hsla(${em.hue},${em.sat}%,80%,${la*0.8})`;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Fire glow — uses fireGlowSpeed
  const tFireGlowRef = useRef(0);
  const fireGlowRef = useCanvas(effect === "fire", [fireGlowSpeed, intensity], (ctx, w, h) => {
    tFireGlowRef.current += 0.016 / Math.max(fireGlowSpeed, 0.5);
    const [hf1,sf1,lf1] = hue1Ref.current, [hf2,sf2,lf2] = hue2Ref.current;
    const breathe = 0.08 * Math.sin(tFireGlowRef.current * Math.PI * 2);
    const glowH = h * (0.55 + breathe);
    const grd = ctx.createLinearGradient(0, h, 0, h - glowH);
    grd.addColorStop(0,    `hsla(${hf1},${sf1}%,${lf1}%,${0.5*intensity})`);
    grd.addColorStop(0.3,  `hsla(${hf2},${sf2}%,${lf2}%,${0.35*intensity})`);
    grd.addColorStop(0.65, `hsla(${hf2},${sf2}%,${lf2}%,${0.08*intensity})`);
    grd.addColorStop(1,    `hsla(${hf2},${sf2}%,${lf2}%,0)`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  });

  // Fire embers — uses fireEmberSpeed
  const fireRef = useCanvas(effect === "fire", [fireEmberSpeed, intensity], (ctx, w, h) => {
    const target = Math.round(45*intensity) + 25;
    while (eRef.current.length < target) { const em=spawnEmber(w,h); em.life=Math.random()*em.maxLife; eRef.current.push(em); }
    if (eRef.current.length > target) eRef.current.length = target;

    for (let i = 0; i < eRef.current.length; i++) {
      const em = eRef.current[i];
      em.x += em.vx * ssEmber;
      em.y += em.vy * ssEmber;
      em.vy -= 0.012 * ssEmber;
      em.vx += (Math.random()-0.5) * 0.05 * ssEmber;
      em.life += ssEmber;
      if (em.life >= em.maxLife || em.y < -10) { eRef.current[i] = spawnEmber(w, h); continue; }

      const lf = em.life / em.maxLife;
      const fade = lf < 0.1 ? lf/0.1 : lf > 0.72 ? 1-(lf-0.72)/0.28 : 1;
      const flicker = (Math.sin(em.life * em.flickerSpeed + em.flickerPhase) + 1) / 2;
      const a = fade * intensity;

      ctx.shadowBlur = 0;

      if (em.kind === "tiny") {
        // Tiny: small bright dot, fast flicker, high opacity burst
        const ta = a * (0.3 + 0.7 * flicker);
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r * (0.6 + 0.4*flicker), 0, Math.PI*2);
        ctx.fillStyle = `hsla(${em.hue},${em.sat}%,${85+10*flicker}%,${ta})`;
        ctx.shadowBlur = 4 + 8*flicker;
        ctx.shadowColor = `hsla(${em.hue},${em.sat}%,80%,${ta})`;
        ctx.fill();

      } else if (em.kind === "medium") {
        // Medium: classic ember dot + small wisp trail
        const ma = a * (0.4 + 0.6*flicker);
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r*(0.5+0.3*flicker), 0, Math.PI*2);
        ctx.fillStyle = `hsla(${em.hue},${em.sat}%,${75+20*flicker}%,${ma})`;
        ctx.shadowBlur = 5 + 5*flicker;
        ctx.shadowColor = `hsla(${em.hue},${em.sat}%,75%,${ma*0.8})`;
        ctx.fill();
        // wisp
        if (em.r > 1.5) {
          const ang = Math.atan2(em.vy, em.vx);
          ctx.save();
          ctx.translate(em.x - Math.cos(ang)*em.r*2.5, em.y - Math.sin(ang)*em.r*2.5);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.ellipse(0, 0, em.r*0.1, em.r*(0.5+0.4*flicker), 0, 0, Math.PI*2);
          ctx.fillStyle = `hsla(${em.hue},${em.sat}%,65%,${ma*0.25})`;
          ctx.fill();
          ctx.restore();
        }

      } else if (em.kind === "large") {
        // Large: big glowing orb, slow gentle flicker, soft glow
        const la = a * (0.25 + 0.4*flicker);
        // outer soft glow
        const grd = ctx.createRadialGradient(em.x, em.y, 0, em.x, em.y, em.r*(1.2+0.4*flicker));
        grd.addColorStop(0,   `hsla(${em.hue},${em.sat}%,80%,${la})`);
        grd.addColorStop(0.5, `hsla(${em.hue},${em.sat}%,60%,${la*0.5})`);
        grd.addColorStop(1,   `hsla(${em.hue},${em.sat}%,40%,0)`);
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r*(1.2+0.4*flicker), 0, Math.PI*2);
        ctx.fillStyle = grd;
        ctx.fill();
        // bright core
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r*0.35, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${em.hue},${em.sat}%,92%,${la*1.4})`;
        ctx.fill();

      } else {
        // Line: thin elongated streak in direction of travel
        const la = a * (0.4 + 0.6*flicker);
        const ang = Math.atan2(em.vy, em.vx);
        const len = 6 + em.speed * 8 + flicker * 6;
        ctx.save();
        ctx.translate(em.x, em.y);
        ctx.rotate(ang);
        // gradient streak fading at tail
        const sg = ctx.createLinearGradient(-len, 0, em.r*2, 0);
        sg.addColorStop(0,   `hsla(${em.hue},${em.sat}%,70%,0)`);
        sg.addColorStop(0.6, `hsla(${em.hue},${em.sat}%,80%,${la*0.6})`);
        sg.addColorStop(1,   `hsla(${em.hue},${em.sat}%,95%,${la})`);
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(em.r*2, 0);
        ctx.strokeStyle = sg;
        ctx.lineWidth = em.r * (0.6 + 0.6*flicker);
        ctx.lineCap = "round";
        ctx.shadowBlur = 4 + 6*flicker;
        ctx.shadowColor = `hsla(${em.hue},${em.sat}%,80%,${la*0.8})`;
        ctx.stroke();
        ctx.restore();
      }
    }
  });

  const fireOuterRef = useCanvas(effect === "fire", [fireGlowSpeed, intensity], (ctx, w, h) => {
    const [hf1,sf1,lf1] = hue1Ref.current, [hf2,sf2,lf2] = hue2Ref.current;
    const glowH = h*(0.6+0.08*Math.sin(Date.now()*ssGlow*1.1));
    const grd = ctx.createLinearGradient(0, h, 0, h-glowH);
    grd.addColorStop(0,   `hsla(${hf1},${sf1}%,${lf1}%,${0.4*intensity})`);
    grd.addColorStop(0.35,`hsla(${hf2},${sf2}%,${lf2}%,${0.2*intensity})`);
    grd.addColorStop(0.7, `hsla(${hf2},${sf2}%,${lf2}%,${0.05*intensity})`);
    grd.addColorStop(1,   `hsla(${hf2},${sf2}%,${lf2}%,0)`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  });

  // ── Reactive Ripple ───────────────────────────────────────────────────────
  // Two canvases stacked:
  //  reactive3DRef   — overlay blend: draws only the dark shadow trough, giving
  //                    the 3D "surface rippling" depth look
  //  reactiveGlowRef — screen blend: draws the intense colored glow ring,
  //                    same brightness as before. Also owns ripple detection.

  // Screen-blend color glow — handles detection, spawning, and color rendering
  const reactiveGlowRef = useCanvas(effect === "reactive", [speed, intensity], (ctx, w, h) => {
    reactRealTRef.current += 0.016;
    const rt = reactRealTRef.current;
    const rippleLife = Math.max(speed, 0.5) * 0.22;

    ripplesRef.current = ripplesRef.current.filter(r => rt - r.startT < rippleLife);

    const cur  = pressedRef.current;
    const prev = prevPressedRef.current;
    for (const idx of cur) {
      if (!prev.has(idx)) {
        const pos = btnPosRef.current[idx];
        if (pos) {
          const [hw, hh] = buttonHWHH(pos, w);
          ripplesRef.current.push({ cx:(pos.x/100)*w, cy:(pos.y/100)*h, startT:rt, edgeR:Math.min(hw,hh) });
        }
      }
    }
    prevPressedRef.current = new Set(cur);

    const col = reactColorRef.current;
    const rr  = parseInt(col.slice(1,3), 16);
    const rg  = parseInt(col.slice(3,5), 16);
    const rb  = parseInt(col.slice(5,7), 16);

    for (const rip of ripplesRef.current) {
      const age   = rt - rip.startT;
      const frac  = age / rippleLife;
      const R     = rip.edgeR + frac * Math.max(w, h) * 1.3;
      const T     = Math.max(w, h) * 0.06;
      const alpha = Math.max(0, (1 - frac) * intensity);
      const hue   = (((age / rippleLife) * 300 + (rip.cx / w) * 120) % 360 + 360) % 360;

      const getC = (a: number) => reactRainbowRef.current
        ? `hsla(${hue},100%,65%,${a})`
        : `rgba(${rr},${rg},${rb},${a})`;

      const grd = ctx.createRadialGradient(rip.cx, rip.cy, Math.max(0, R - T), rip.cx, rip.cy, R + T);
      grd.addColorStop(0,   getC(0));
      grd.addColorStop(0.3, getC(alpha * 0.5));
      grd.addColorStop(0.5, getC(alpha));
      grd.addColorStop(0.7, getC(alpha * 0.5));
      grd.addColorStop(1,   getC(0));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }

    // Erase areas of other currently-pressed buttons so their indicators stay visible
  });

  // Overlay-blend shadow trough — reads ripplesRef but never modifies it
  const reactive3DRef = useCanvas(effect === "reactive", [speed, intensity], (ctx, w, h) => {
    const rt         = reactRealTRef.current;
    const rippleLife = Math.max(speed, 0.5) * 0.22;

    for (const rip of ripplesRef.current) {
      const age   = rt - rip.startT;
      if (age < 0) continue;
      const frac  = age / rippleLife;
      const R     = rip.edgeR + frac * Math.max(w, h) * 1.3;
      const T     = Math.max(w, h) * 0.055;
      const alpha = Math.max(0, (1 - frac) * intensity);

      // Dark ring slightly ahead (outer) of the glow ring → looks like a recessed trough
      const sR = R + T * 0.65;
      const sg = ctx.createRadialGradient(rip.cx, rip.cy, Math.max(0, sR - T * 0.9), rip.cx, rip.cy, sR + T * 0.65);
      sg.addColorStop(0,   `rgba(0,0,0,0)`);
      sg.addColorStop(0.3, `rgba(0,0,0,${alpha * 0.30})`);
      sg.addColorStop(0.6, `rgba(0,0,0,${alpha * 0.45})`);
      sg.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }
  });

  // ── Reactive Reverse — mirror of the reactive ripple: instead of a ring
  //    expanding outward from the button, it starts big and far away and
  //    converges inward, brightening as it closes in on the press point. ──
  const reactiveReverseRef = useCanvas(effect === "reactiveReverse", [speed, intensity], (ctx, w, h) => {
    reverseRealTRef.current += 0.016;
    const rt = reverseRealTRef.current;
    const rippleLife = Math.max(speed, 0.5) * 0.22;

    reverseRipplesRef.current = reverseRipplesRef.current.filter(r => rt - r.startT < rippleLife);
    const cur = pressedRef.current, prev = prevPressedRef.current;
    for (const idx of cur) {
      if (!prev.has(idx)) {
        const pos = btnPosRef.current[idx];
        if (pos) {
          const [hw, hh] = buttonHWHH(pos, w);
          reverseRipplesRef.current.push({ cx:(pos.x/100)*w, cy:(pos.y/100)*h, startT:rt, edgeR:Math.min(hw,hh) });
        }
      }
    }
    prevPressedRef.current = new Set(cur);

    const col = reactColorRef.current;
    const rr=parseInt(col.slice(1,3),16), rg=parseInt(col.slice(3,5),16), rb=parseInt(col.slice(5,7),16);
    const maxSpread = Math.max(w,h) * 0.7;

    for (const rip of reverseRipplesRef.current) {
      const age  = rt - rip.startT;
      const frac = Math.min(1, age / rippleLife);
      const R     = rip.edgeR + (1-frac) * maxSpread;  // starts big, converges to the button
      const T     = Math.max(w,h) * 0.06;
      const alpha = frac * intensity;                   // builds as it closes in
      const hue   = (((age/rippleLife)*300 + (rip.cx/w)*120)%360+360)%360;

      const getC = (a:number) => reactRainbowRef.current
        ? `hsla(${hue},100%,65%,${a})` : `rgba(${rr},${rg},${rb},${a})`;

      const grd = ctx.createRadialGradient(rip.cx, rip.cy, Math.max(0,R-T), rip.cx, rip.cy, R+T);
      grd.addColorStop(0,   getC(0));
      grd.addColorStop(0.3, getC(alpha*0.5));
      grd.addColorStop(0.5, getC(alpha));
      grd.addColorStop(0.7, getC(alpha*0.5));
      grd.addColorStop(1,   getC(0));
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,w,h);
    }
  });

  // ── Reactive Fire — a ripple rendered in the same Fire Color 1/2 palette as
  //    the ambient fire effect, plus embers using the same per-kind rendering
  //    as the regular fire embers — but their position rides the wave's own
  //    expanding radius (with a little wobble/bob) instead of flying off with
  //    independent velocity, so they visibly stay pushed along the wave's
  //    outer edge for as long as it's expanding. Rendered in two passes — all
  //    wave gradients, then all embers — so embers always sit in front of
  //    every wave even when multiple presses overlap. ──
  const reactiveFireRef = useCanvas(effect === "reactiveFire", [speed, intensity], (ctx, w, h) => {
    fireBurstTRef.current += 0.016;
    const rt = fireBurstTRef.current;
    const life = Math.max(speed, 0.5) * 0.3;

    fireBurstEventsRef.current = fireBurstEventsRef.current.filter(e => rt - e.startT < e.life);
    const cur = pressedRef.current, prev = prevPressedRef.current;
    for (const idx of cur) {
      if (!prev.has(idx)) {
        const pos = btnPosRef.current[idx];
        if (pos) {
          const cx = (pos.x/100)*w, cy = (pos.y/100)*h;
          const n = 12;
          const embers: RideEmber[] = [];
          for (let i=0; i<n; i++) embers.push(spawnRideEmber(i, n));
          fireBurstEventsRef.current.push({ cx, cy, startT: rt, life, embers });
        }
      }
    }
    prevPressedRef.current = new Set(cur);

    ctx.clearRect(0,0,w,h);
    const [hf1,sf1] = hue1Ref.current, [hf2,sf2] = hue2Ref.current;
    const maxSpread = Math.max(w,h) * 0.45;

    // Pass 1 — every wave first
    for (const evt of fireBurstEventsRef.current) {
      const age = rt - evt.startT;
      const frac = Math.min(1, age / evt.life);
      const R = frac * maxSpread;
      const alpha = Math.max(0, 1 - frac) * intensity;
      if (alpha <= 0.02 || R < 1) continue;
      const T = Math.max(w,h) * 0.05;
      const grd = ctx.createRadialGradient(evt.cx, evt.cy, Math.max(0,R-T), evt.cx, evt.cy, R+T);
      grd.addColorStop(0,   `hsla(${hf1},${sf1}%,55%,0)`);
      grd.addColorStop(0.4, `hsla(${hf1},${sf1}%,55%,${alpha*0.8})`);
      grd.addColorStop(0.7, `hsla(${hf2},${sf2}%,50%,${alpha*0.5})`);
      grd.addColorStop(1,   `hsla(${hf2},${sf2}%,50%,0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,w,h);
    }

    // Pass 2 — every ember on top, riding its wave's current radius
    for (const evt of fireBurstEventsRef.current) {
      const age = rt - evt.startT;
      const frac = Math.min(1, age / evt.life);
      const R = frac * maxSpread;
      const alpha = Math.max(0, 1 - frac);
      updateAndDrawRideEmbers(ctx, evt.embers, evt.cx, evt.cy, R, maxSpread, age, alpha, intensity);
    }
  });

  // ── Particle Burst — a one-shot explosion of glowing particles flying
  //    outward from the pressed button's edge, decelerating and fading out. ──
  const burstRef = useCanvas(effect === "particleBurst", [speed, intensity], (ctx, w, h) => {
    burstTRef.current += 0.016;
    const rt = burstTRef.current;
    const life = Math.max(speed, 0.5) * 0.5;

    burstEventsRef.current = burstEventsRef.current.filter(e => rt - e.startT < e.life);
    const cur = pressedRef.current, prev = prevPressedRef.current;
    for (const idx of cur) {
      if (!prev.has(idx)) {
        const pos = btnPosRef.current[idx];
        if (pos) {
          const [hw, hh] = buttonHWHH(pos, w);
          const n = 14 + Math.floor(Math.random()*10);
          burstEventsRef.current.push({
            startT: rt, life,
            particles: genBurstParticles((pos.x/100)*w, (pos.y/100)*h, hw, hh, Math.max(w,h), n),
          });
        }
      }
    }
    prevPressedRef.current = new Set(cur);

    const col = reactColorRef.current;
    const rr=parseInt(col.slice(1,3),16), rg=parseInt(col.slice(3,5),16), rb=parseInt(col.slice(5,7),16);

    for (const evt of burstEventsRef.current) {
      const age = rt - evt.startT;
      const tn = Math.min(1, age / evt.life);
      const fadeAlpha = Math.max(0, 1 - Math.pow(tn, 1.6)) * intensity;
      if (fadeAlpha <= 0.01) continue;

      for (const p of evt.particles) {
        const decay = 1 - Math.exp(-p.drag * age);
        let px = p.x0 + (p.vx / p.drag) * decay;
        let py = p.y0 + (p.vy / p.drag) * decay;

        // Perpendicular wander so tracks aren't perfectly straight radial lines —
        // ramps in from zero at spawn, fades out as the particle settles.
        const perpX = -Math.sin(p.angle), perpY = Math.cos(p.angle);
        const jitter = Math.sin(age*p.jitterFreq + p.jitterPhase) * p.jitterAmp * Math.min(1, age*3) * (1-tn);
        px += perpX * jitter;
        py += perpY * jitter;

        const flicker = 0.7 + 0.3*Math.sin(age*p.flickerSpeed + p.flickerPhase);
        const size = p.size * (1 - 0.35*tn) * flicker;
        if (size <= 0.15) continue;
        const alpha = fadeAlpha * flicker;

        const hue = reactRainbowRef.current ? (p.hueOff + age * 220) % 360 : 0;
        const colorC = reactRainbowRef.current ? `hsla(${hue},100%,62%,` : `rgba(${rr},${rg},${rb},`;

        ctx.save();
        ctx.shadowBlur = 8; ctx.shadowColor = `${colorC}${alpha*0.8})`;
        ctx.fillStyle = `${colorC}${alpha})`;
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI*2); ctx.fill();

        // Tiny bright core for extra pop
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${alpha*0.7})`;
        ctx.beginPath(); ctx.arc(px, py, size*0.4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {effect === "pulseGlow" && (
        <canvas ref={glowRef} style={{ ...makeCanvas(maskUrl), mixBlendMode: "normal" as const }} />
      )}
      {effect === "particles" && <canvas ref={particleRef} style={makeCanvas(maskUrl)} />}
      {effect === "fire" && <>
        <canvas ref={fireGlowRef} style={makeCanvas(maskUrl)} />
        <canvas ref={fireRef} style={makeCanvas(maskUrl)} />
      </>}
      {effect === "reactive" && <>
        <canvas ref={reactive3DRef}   style={{ ...makeCanvas(maskUrl), mixBlendMode: "overlay" as const }} />
        <canvas ref={reactiveGlowRef} style={makeCanvas(maskUrl)} />
      </>}
      {effect === "reactiveReverse" && <canvas ref={reactiveReverseRef} style={makeCanvas(maskUrl)} />}
      {effect === "reactiveFire" && <canvas ref={reactiveFireRef} style={makeCanvas(maskUrl)} />}
      {effect === "particleBurst" && <canvas ref={burstRef} style={makeCanvas(maskUrl)} />}
    </div>
  );
}
