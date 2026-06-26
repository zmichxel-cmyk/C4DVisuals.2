import { useRef, useEffect } from "react";

export type BodyEffectType = "none" | "pulseGlow" | "particles" | "fire";

interface Props {
  effect: BodyEffectType;
  speed: number;
  intensity: number;
  maskUrl: string;
  glowColor: string;
  fireColor2?: string;
  fireGlowSpeed?: number;
  fireEmberSpeed?: number;
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

export function BodyEffectOverlay({ effect, speed, intensity, maskUrl, glowColor, fireColor2 = "#ff8800", fireGlowSpeed = 4, fireEmberSpeed = 6 }: Props) {
  const ss = 1 / Math.max(speed, 0.5);

  // Reactive color refs — updated immediately so running tick loops pick up changes
  const hue1Ref = useRef(hexToHsl(glowColor));
  const hue2Ref = useRef(hexToHsl(fireColor2));
  useEffect(() => { hue1Ref.current = hexToHsl(glowColor); }, [glowColor]);
  useEffect(() => { hue2Ref.current = hexToHsl(fireColor2); }, [fireColor2]);

  // Raw hex color ref for pulse glow — avoids HSL instability with low-saturation colors
  const glowColorRef = useRef(glowColor);
  useEffect(() => { glowColorRef.current = glowColor; }, [glowColor]);

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
    </div>
  );
}
