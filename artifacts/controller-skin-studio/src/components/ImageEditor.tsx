import { useRef, useState, useEffect, useCallback } from "react";
import { Upload, Eraser, Paintbrush, Wand2, Undo2, RotateCcw, ZoomIn, ZoomOut, Image as ImageIcon, Square, Circle, Check, X, ArrowRightCircle, MousePointer } from "lucide-react";
import { ControllerType, CONTROLLER_TYPES } from "../lib/layouts";

type Tool = "select" | "wand" | "erase" | "restore" | "crop-rect" | "crop-circle";
export type ExportSlot = "controllerSkin" | "leftStickSkin" | "rightStickSkin";

interface HistoryEntry {
  data: ImageData;
}

interface Selection {
  x: number; y: number; w: number; h: number;
}

interface BezelInstance {
  id: number;
  x: number; y: number;
  size: number;
  color: string; // hex color to tint the bezel
}

const BEZEL_URL = "/analog-bezel.png";
const MAX_HISTORY = 20;

interface Props {
  onExportToSkin: (dataUrl: string, slot: ExportSlot, controllerType: ControllerType) => void;
  onClearSlot: (slot: ExportSlot, controllerType: ControllerType) => void;
  pendingSkins: Partial<Record<string, Partial<Record<ExportSlot, string>>>>;
  activeControllerType: ControllerType;
  activeConfig: { controllerSkin: string | null; leftStickSkin: string | null; rightStickSkin: string | null };
}

// ── Blend mode definitions (module-level so Babel handles type alias correctly) ──
const BLEND_MODES = [
  { id: "normal",      label: "Normal"      },
  { id: "multiply",    label: "Multiply"    },
  { id: "screen",      label: "Screen"      },
  { id: "overlay",     label: "Overlay"     },
  { id: "soft-light",  label: "Soft Light"  },
  { id: "hard-light",  label: "Hard Light"  },
  { id: "color-dodge", label: "Color Dodge" },
  { id: "color-burn",  label: "Color Burn"  },
  { id: "darken",      label: "Darken"      },
  { id: "lighten",     label: "Lighten"     },
  { id: "difference",  label: "Difference"  },
  { id: "luminosity",  label: "Luminosity"  },
] as const;
type BlendModeId = "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "hard-light" | "color-dodge" | "color-burn" | "darken" | "lighten" | "difference" | "luminosity";
const BLEND_MODE_IDX: Record<string, number> = Object.fromEntries(BLEND_MODES.map((m, i) => [m.id, i]));

// ── Sidebar helper components ──────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/60 p-3 space-y-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      {children}
    </div>
  );
}

/** Single value row: slider + numeric text input. */
function NumRow({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit?: string;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <input type="number" value={value} min={min} max={max} step={step}
            onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="w-14 text-[10px] text-right bg-muted/30 border border-border rounded px-1 py-0.5" />
          {unit && <span className="text-[9px] text-muted-foreground/60">{unit}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 accent-primary cursor-pointer" />
    </div>
  );
}

/** Dual-value row for Blend If feathered range.
 *  Two independent sliders: Start (lo) and End (hi).
 *  For Shadows:    both start at 0   — drag right to cut dark pixels.
 *  For Highlights: both start at 255 — drag left  to cut bright pixels.
 */
function DualRow({ label, lo, hi, setLo, setHi }: {
  label: string; lo: number; hi: number;
  setLo: (v: number) => void; setHi: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {/* Start handle */}
      <div className="grid grid-cols-[32px_1fr_40px] gap-x-1.5 items-center">
        <span className="text-[9px] text-muted-foreground/50 text-right">Start</span>
        <input type="range" min={0} max={255} step={1} value={lo}
          onChange={e => setLo(Number(e.target.value))}
          className="w-full h-1 accent-primary cursor-pointer" />
        <input type="number" min={0} max={255} value={lo}
          onChange={e => setLo(Math.min(255, Math.max(0, Number(e.target.value))))}
          className="w-full text-[9px] text-right bg-muted/30 border border-border rounded px-1 py-0.5" />
      </div>
      {/* End handle (feather) */}
      <div className="grid grid-cols-[32px_1fr_40px] gap-x-1.5 items-center">
        <span className="text-[9px] text-muted-foreground/50 text-right">End</span>
        <input type="range" min={0} max={255} step={1} value={hi}
          onChange={e => setHi(Number(e.target.value))}
          className="w-full h-1 accent-primary cursor-pointer" />
        <input type="number" min={0} max={255} value={hi}
          onChange={e => setHi(Math.min(255, Math.max(0, Number(e.target.value))))}
          className="w-full text-[9px] text-right bg-muted/30 border border-border rounded px-1 py-0.5" />
      </div>
      {/* Visual range indicator */}
      <div className="h-0.5 bg-border/30 rounded-full relative">
        <div className="absolute h-full bg-primary/50 rounded-full"
          style={{
            left:  `${(Math.min(lo,hi)/255)*100}%`,
            width: `${(Math.abs(hi-lo)/255)*100}%`,
          }} />
      </div>
    </div>
  );
}

export function ImageEditor({ onExportToSkin, onClearSlot, pendingSkins, activeControllerType, activeConfig }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoEditRef = useRef<HTMLVideoElement>(null); // ref to canvas-area video for frame capture

  // Original (untouched) image data, used as source for "restore" brush
  const originalDataRef = useRef<ImageData | null>(null);
  // History stack for undo
  const historyRef = useRef<HistoryEntry[]>([]);

  const [hasImage, setHasImage] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [tolerance, setTolerance] = useState(32);
  const [brushSize, setBrushSize] = useState(24);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const selDragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; orig: Selection } | null>(null);
  const [exportSlot, setExportSlot] = useState<ExportSlot>("controllerSkin");
  // exportTarget is derived from activeControllerType so it's always in sync with the
  // active tab. The override is only set when the user manually picks a different
  // controller in the dropdown, and is cleared whenever the tab changes.
  const [exportTargetOverride, setExportTargetOverride] = useState<ControllerType | null>(null);
  const exportTarget = exportTargetOverride ?? activeControllerType;
  const [exportDone, setExportDone] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodingProgress, setEncodingProgress] = useState(0);
  // Tracks the blob URL of the most recently baked WebM so the Controller Body
  // slot card updates instantly — without waiting for Studio's config prop to cycle back.
  const [bakedWebmUrl, setBakedWebmUrl] = useState<string | null>(null);

  // Clear manual override when the user switches tabs
  useEffect(() => {
    setExportTargetOverride(null);
  }, [activeControllerType]);
  const [croppedResult, setCroppedResult] = useState<{ url: string; w: number; h: number } | null>(null);

  // Bezel instances on canvas
  const [bezels, setBezels] = useState<BezelInstance[]>([]);
  const [selectedBezel, setSelectedBezel] = useState<number | null>(null);
  const bezelNextId = useRef(0);
  const bezelDragRef = useRef<{ id: number; mode: "move" | "resize"; startX: number; startY: number; origX: number; origY: number; origSize: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Logo Placement ───────────────────────────────────────────────────────────
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [logoSrc,       setLogoSrc]       = useState<string | null>(null);
  const [logoPos,       setLogoPos]       = useState({ x: 100, y: 100, w: 200, h: 200, rot: 0 });
  const [logoBlendMode, setLogoBlendMode] = useState<BlendModeId>("normal");
  const [logoOpacity,   setLogoOpacity]   = useState(0.85);
  // Blend If – This Layer (logo luma). Each range has a feather pair: [start, end].
  // At default (0/0 and 255/255) both smoothsteps collapse to step → no masking.
  const [biThisShLo, setBiThisShLo] = useState(0);     // shadow fade-in start
  const [biThisShHi, setBiThisShHi] = useState(0);     // shadow fade-in end (feather)
  const [biThisHiLo, setBiThisHiLo] = useState(255);   // highlight fade-out start
  const [biThisHiHi, setBiThisHiHi] = useState(255);   // highlight fade-out end (feather)
  // Blend If – Underlying Layer (surface luma)
  const [biUndShLo, setBiUndShLo]   = useState(0);
  const [biUndShHi, setBiUndShHi]   = useState(0);
  const [biUndHiLo, setBiUndHiLo]   = useState(255);
  const [biUndHiHi, setBiUndHiHi]   = useState(255);
  // Displacement – separate horizontal / vertical Sobel warp
  const [dispX, setDispX] = useState(0);
  const [dispY, setDispY] = useState(0);
  // Surface softening – Gaussian blur applied to the logo before compositing
  const [logoBlur, setLogoBlur] = useState(0);
  // Placement helpers
  const [lockAspect, setLockAspect] = useState(true);
  const [logoSelected, setLogoSelected] = useState(false);

  const logoDragRef = useRef<{ mode: "move" | "resize" | "rotate"; startX: number; startY: number; origPos: typeof logoPos; startAngle?: number } | null>(null);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      setLogoSrc(src);
      const img = new Image();
      img.onload = () => {
        logoImgRef.current = img;
        // Set initial size preserving aspect ratio, max 300px wide
        const maxW = 300;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const cv = canvasRef.current;
        const cx = cv ? Math.round((cv.width - w) / 2) : 100;
        const cy = cv ? Math.round((cv.height - h) / 2) : 100;
        setLogoPos({ x: cx, y: cy, w, h, rot: 0 });
        setLogoSelected(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── WebGL engraving pipeline ──────────────────────────────────────────────
  const webglRef = useRef<WebGLRenderingContext | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);

  // Initialize the WebGL context + compile shaders once on mount
  useEffect(() => {
    const cv = document.createElement("canvas");
    cv.width = 2; cv.height = 2;
    const gl = cv.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return;
    webglCanvasRef.current = cv;
    webglRef.current = gl;

    const VS = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main(){
        v_uv = a_pos * 0.5 + 0.5;
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;
    const FS = `
      precision mediump float;
      uniform sampler2D u_surface;
      uniform sampler2D u_logo;
      uniform vec2 u_res;
      uniform float u_opacity;
      uniform int u_blendMode;
      // Blend If – vec4(shadowStart, shadowEnd, highlightStart, highlightEnd) in 0-1
      uniform vec4 u_biThis;
      uniform vec4 u_biUnd;
      // Displacement – separate horizontal and vertical Sobel scale
      uniform vec2 u_disp;
      varying vec2 v_uv;

      vec3 lw = vec3(0.299, 0.587, 0.114);

      // ── Blend modes ──────────────────────────────────────────────────────────
      vec3 bmMultiply(vec3 b,vec3 s)  { return b*s; }
      vec3 bmScreen(vec3 b,vec3 s)    { return 1.0-(1.0-b)*(1.0-s); }
      vec3 bmOverlay(vec3 b,vec3 s)   { return mix(2.0*b*s, 1.0-2.0*(1.0-b)*(1.0-s), step(0.5,b)); }
      vec3 bmSoftLight(vec3 b,vec3 s) {
        return mix(2.0*b*s+b*b*(1.0-2.0*s), sqrt(b)*(2.0*s-1.0)+2.0*b*(1.0-s), step(0.5,s));
      }
      vec3 bmHardLight(vec3 b,vec3 s) { return mix(2.0*b*s, 1.0-2.0*(1.0-b)*(1.0-s), step(0.5,s)); }
      vec3 bmColorDodge(vec3 b,vec3 s){ return clamp(b/max(1.0-s,0.001),0.0,1.0); }
      vec3 bmColorBurn(vec3 b,vec3 s) { return clamp(1.0-(1.0-b)/max(s,0.001),0.0,1.0); }
      vec3 bmDarken(vec3 b,vec3 s)    { return min(b,s); }
      vec3 bmLighten(vec3 b,vec3 s)   { return max(b,s); }
      vec3 bmDifference(vec3 b,vec3 s){ return abs(b-s); }
      vec3 bmLuminosity(vec3 b,vec3 s){ float bl=dot(b,lw),sl=dot(s,lw); return clamp(b+(sl-bl),0.0,1.0); }

      void main(){
        vec4 surf = texture2D(u_surface, v_uv);

        // ── Displacement: offset logo UVs along surface Sobel gradient ────────
        vec2 px = 1.0/u_res;
        float tl=dot(texture2D(u_surface,v_uv+vec2(-px.x,-px.y)).rgb,lw);
        float tm=dot(texture2D(u_surface,v_uv+vec2(0.0,-px.y)).rgb,lw);
        float tr=dot(texture2D(u_surface,v_uv+vec2(px.x,-px.y)).rgb,lw);
        float ml=dot(texture2D(u_surface,v_uv+vec2(-px.x,0.0)).rgb,lw);
        float mr=dot(texture2D(u_surface,v_uv+vec2(px.x,0.0)).rgb,lw);
        float bl2=dot(texture2D(u_surface,v_uv+vec2(-px.x,px.y)).rgb,lw);
        float bm=dot(texture2D(u_surface,v_uv+vec2(0.0,px.y)).rgb,lw);
        float br=dot(texture2D(u_surface,v_uv+vec2(px.x,px.y)).rgb,lw);
        float gx = (tr+2.0*mr+br)-(tl+2.0*ml+bl2);
        float gy = (bl2+2.0*bm+br)-(tl+2.0*tm+tr);
        // Separate X/Y displacement scale
        vec2 dispUV = clamp(v_uv + vec2(gx*u_disp.x, gy*u_disp.y)*px, 0.0, 1.0);

        vec4 logoCol = texture2D(u_logo, dispUV);
        float a = logoCol.a;
        if(a < 0.01){ gl_FragColor = surf; return; }

        // Use the logo's own RGB colors exactly as uploaded
        vec3 logoRGB = logoCol.rgb;
        float logoLuma = dot(logoRGB, lw);
        float surfLuma = dot(surf.rgb, lw);

        // ── Blend If – feathered dual-range (Photoshop-style) ────────────────
        // u_biThis/u_biUnd = vec4(shadowStart, shadowEnd, highlightStart, highlightEnd)
        // When start == end the smoothstep collapses to a hard step (no feather).
        float eps = 0.001;
        float thisShadow = smoothstep(u_biThis.x, max(u_biThis.x+eps, u_biThis.y), logoLuma);
        float thisHigh   = 1.0 - smoothstep(u_biThis.z, max(u_biThis.z+eps, u_biThis.w), logoLuma);
        float thisMask   = thisShadow * thisHigh;

        float undShadow  = smoothstep(u_biUnd.x, max(u_biUnd.x+eps, u_biUnd.y), surfLuma);
        float undHigh    = 1.0 - smoothstep(u_biUnd.z, max(u_biUnd.z+eps, u_biUnd.w), surfLuma);
        float undMask    = undShadow * undHigh;

        float totalA = a * thisMask * undMask;
        if(totalA < 0.01){ gl_FragColor = surf; return; }

        // ── Apply blend mode ──────────────────────────────────────────────────
        vec3 blended;
        if     (u_blendMode==0)  blended = logoRGB;
        else if(u_blendMode==1)  blended = bmMultiply(surf.rgb,logoRGB);
        else if(u_blendMode==2)  blended = bmScreen(surf.rgb,logoRGB);
        else if(u_blendMode==3)  blended = bmOverlay(surf.rgb,logoRGB);
        else if(u_blendMode==4)  blended = bmSoftLight(surf.rgb,logoRGB);
        else if(u_blendMode==5)  blended = bmHardLight(surf.rgb,logoRGB);
        else if(u_blendMode==6)  blended = bmColorDodge(surf.rgb,logoRGB);
        else if(u_blendMode==7)  blended = bmColorBurn(surf.rgb,logoRGB);
        else if(u_blendMode==8)  blended = bmDarken(surf.rgb,logoRGB);
        else if(u_blendMode==9)  blended = bmLighten(surf.rgb,logoRGB);
        else if(u_blendMode==10) blended = bmDifference(surf.rgb,logoRGB);
        else                     blended = bmLuminosity(surf.rgb,logoRGB);

        blended = clamp(blended, 0.0, 1.0);
        float finalA = surf.a > 0.0 ? 1.0 : 0.0;
        gl_FragColor = vec4(mix(surf.rgb, blended, u_opacity*clamp(totalA*1.5,0.0,1.0)), finalA);
      }
    `;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(prog));
      return; // Don't store invalid program — render effect will use 2D fallback
    }
    glProgramRef.current = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  }, []);

  // Re-render the display canvas whenever logo settings change.
  // Tries WebGL for blend-if + displacement; falls back to 2D canvas if WebGL fails.
  useEffect(() => {
    const display = displayCanvasRef.current;
    const source  = canvasRef.current;
    if (!display || !source) return;
    const W = source.width, H = source.height;
    display.width = W; display.height = H;
    const ctx = display.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    // For the base display (no logo active), show the surface.
    // For PNG: draw from canvas (safe). For WebM: the video element sits beneath
    // the display canvas at a lower z-index so we don't need to draw it here.
    const vidEl = videoEditRef.current;
    if (!isVideo) ctx.drawImage(source, 0, 0);

    const logo = logoImgRef.current;
    if (!logo || !logoSrc) return;

    const { x, y, w, h, rot } = logoPos;
    const lcx = x + w / 2, lcy = y + h / 2;
    const rotRad = (rot * Math.PI) / 180;

    const gl   = webglRef.current;
    const prog = glProgramRef.current;
    const glCv = webglCanvasRef.current;
    let webglOk = false;

    if (gl && prog && glCv && W > 0 && H > 0) {
      try {
        glCv.width = W; glCv.height = H;
        gl.viewport(0, 0, W, H);
        gl.useProgram(prog);

        const mkTex = (unit: number, src: TexImageSource) => {
          const t = gl.createTexture()!;
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
          return t;
        };

        // Upload surface DIRECTLY — for WebM use the video element itself (no 2D
        // canvas intermediary). Drawing video through a 2D canvas taints it, which
        // then taints the WebGL canvas, which taints the display canvas, which makes
        // toDataURL() throw a SecurityError. Uploading vidEl directly to a WebGL
        // texture is same-origin-clean for blob: URLs and avoids the taint chain.
        const surfaceSource: TexImageSource = (isVideo && vidEl && vidEl.readyState >= 2)
          ? vidEl
          : source;
        const surfTex = mkTex(0, surfaceSource);

        const logoCv = document.createElement("canvas");
        logoCv.width = W; logoCv.height = H;
        const lctx = logoCv.getContext("2d")!;
        lctx.save();
        lctx.translate(lcx, lcy);
        lctx.rotate(rotRad);
        if (logoBlur > 0) lctx.filter = `blur(${logoBlur}px)`;
        lctx.drawImage(logo, -w / 2, -h / 2, w, h);
        lctx.restore();
        const logoTex = mkTex(1, logoCv);

        const ul = (n: string) => gl.getUniformLocation(prog, n);
        gl.uniform1i(ul("u_surface"),   0);
        gl.uniform1i(ul("u_logo"),      1);
        gl.uniform2f(ul("u_res"),       W, H);
        gl.uniform1f(ul("u_opacity"),   logoOpacity);
        gl.uniform1i(ul("u_blendMode"), BLEND_MODE_IDX[logoBlendMode] ?? 0);
        gl.uniform4f(ul("u_biThis"),    biThisShLo/255, biThisShHi/255, biThisHiLo/255, biThisHiHi/255);
        gl.uniform4f(ul("u_biUnd"),     biUndShLo/255,  biUndShHi/255,  biUndHiLo/255,  biUndHiHi/255);
        gl.uniform2f(ul("u_disp"),      dispX, dispY);

        const buf2 = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(glCv, 0, 0);
        gl.deleteTexture(surfTex);
        gl.deleteTexture(logoTex);
        gl.deleteBuffer(buf2);
        webglOk = true;
      } catch (err) {
        console.warn("WebGL logo render failed, using 2D fallback:", err);
      }
    }

    // 2D canvas fallback — all blend modes work; blend-if / displacement not applied.
    // For WebM: skip drawing the video frame (avoids tainting the display canvas).
    // The video element still shows beneath at z:9, so the user sees the surface.
    if (!webglOk) {
      const MODE_2D: Record<string, GlobalCompositeOperation> = {
        "normal":      "source-over", "multiply":    "multiply",
        "screen":      "screen",      "overlay":     "overlay",
        "soft-light":  "soft-light",  "hard-light":  "hard-light",
        "color-dodge": "color-dodge", "color-burn":  "color-burn",
        "darken":      "darken",      "lighten":     "lighten",
        "difference":  "difference",  "luminosity":  "luminosity",
      };
      if (!isVideo) ctx.drawImage(source, 0, 0); // PNG base (safe, no taint)
      ctx.save();
      ctx.globalAlpha = logoOpacity;
      ctx.globalCompositeOperation = MODE_2D[logoBlendMode] ?? "source-over";
      ctx.translate(lcx, lcy);
      ctx.rotate(rotRad);
      ctx.drawImage(logo, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // NOTE: selection handles are rendered as an SVG overlay, NOT drawn here,
    // so toDataURL() on this canvas is always clean for export.
  }, [logoSrc, logoPos, logoBlendMode, logoOpacity,
      biThisShLo, biThisShHi, biThisHiLo, biThisHiHi,
      biUndShLo, biUndShHi, biUndHiLo, biUndHiHi,
      dispX, dispY, logoBlur, logoSelected, hasImage]);

  function handleDisplayMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!logoSrc || !logoImgRef.current) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = (imgDims?.w ?? 1) / rect.width;
    const scaleY = (imgDims?.h ?? 1) / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const { x, y, w, h, rot } = logoPos;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rotRad = (rot * Math.PI) / 180;

    // Transform mouse into logo-local space
    const dx = mx - cx, dy = my - cy;
    const localX = dx * Math.cos(-rotRad) - dy * Math.sin(-rotRad);
    const localY = dx * Math.sin(-rotRad) + dy * Math.cos(-rotRad);

    // Rotate handle: top-center, 20px above
    const rhX = 0, rhY = -h / 2 - 20;
    if (Math.abs(localX - rhX) < 12 && Math.abs(localY - rhY) < 12) {
      const startAngle = Math.atan2(my - cy, mx - cx) * 180 / Math.PI;
      logoDragRef.current = { mode: "rotate", startX: mx, startY: my, origPos: { ...logoPos }, startAngle };
      setLogoSelected(true);
      return;
    }
    // Resize handle: bottom-right corner
    if (Math.abs(localX - w / 2) < 14 && Math.abs(localY - h / 2) < 14) {
      logoDragRef.current = { mode: "resize", startX: mx, startY: my, origPos: { ...logoPos } };
      setLogoSelected(true);
      return;
    }
    // Move: inside bounding box
    if (localX >= -w / 2 && localX <= w / 2 && localY >= -h / 2 && localY <= h / 2) {
      logoDragRef.current = { mode: "move", startX: mx, startY: my, origPos: { ...logoPos } };
      setLogoSelected(true);
      return;
    }
    setLogoSelected(false);
  }

  function handleDisplayMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const drag = logoDragRef.current;
    if (!drag) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = (imgDims?.w ?? 1) / rect.width;
    const scaleY = (imgDims?.h ?? 1) / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const dx = mx - drag.startX;
    const dy = my - drag.startY;
    if (drag.mode === "move") {
      setLogoPos({ ...drag.origPos, x: drag.origPos.x + dx, y: drag.origPos.y + dy });
    } else if (drag.mode === "resize") {
      const newW = Math.max(20, drag.origPos.w + dx * 1.5);
      const aspect = drag.origPos.h / drag.origPos.w;
      setLogoPos({ ...drag.origPos, w: newW, h: Math.round(newW * aspect) });
    } else if (drag.mode === "rotate") {
      const origCx = drag.origPos.x + drag.origPos.w / 2;
      const origCy = drag.origPos.y + drag.origPos.h / 2;
      const currentAngle = Math.atan2(my - origCy, mx - origCx) * 180 / Math.PI;
      const delta = currentAngle - (drag.startAngle ?? 0);
      setLogoPos({ ...drag.origPos, rot: (drag.origPos.rot + delta + 360) % 360 });
    }
  }

  function handleDisplayMouseUp() {
    logoDragRef.current = null;
  }

  function bakeLogoToCanvas() {
    const display = displayCanvasRef.current;
    const source  = canvasRef.current;
    if (!display || !source || !logoSrc || !logoImgRef.current) return;

    pushHistory();
    const ctx = source.getContext("2d")!;

    // Copy the WebGL-composited display canvas (surface + logo with blend effects).
    // The display canvas is NOT tainted (WebGL used vidEl directly, not surfaceCv).
    try {
      ctx.clearRect(0, 0, source.width, source.height);
      ctx.drawImage(display, 0, 0);
      try { originalDataRef.current = ctx.getImageData(0, 0, source.width, source.height); } catch { }
    } catch {
      // Fallback: direct 2D composite
      const vidEl = videoEditRef.current;
      if (isVideo && vidEl && vidEl.readyState >= 2) {
        ctx.clearRect(0, 0, source.width, source.height);
        ctx.drawImage(vidEl, 0, 0, source.width, source.height);
      }
      const { x, y, w, h, rot } = logoPos;
      ctx.save();
      ctx.globalAlpha = logoOpacity;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((rot * Math.PI) / 180);
      if (logoBlur > 0) ctx.filter = `blur(${logoBlur}px)`;
      ctx.drawImage(logoImgRef.current, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    setLogoSrc(null);
    logoImgRef.current = null;
    setLogoSelected(false);
    // Baking commits to a static PNG — clear WebM so export uses the canvas
    setIsVideo(false);
    setVideoUrl(null);
    videoFileRef.current = null;
  }


  // Scroll wheel zoom — must be non-passive to call preventDefault()
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!hasImage) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(z => Math.min(4, Math.max(0.1, +(z + delta).toFixed(2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [hasImage]);

  function pushHistory() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push({ data });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const entry = historyRef.current.pop();
    if (!entry) return;
    ctx.putImageData(entry.data, 0, 0);
  }

  function resetToOriginal() {
    const canvas = canvasRef.current;
    const orig = originalDataRef.current;
    if (!canvas || !orig) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    pushHistory();
    ctx.putImageData(orig, 0, 0);
    setSelection(null);
    setCroppedResult(null);
  }

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoop, setVideoLoop] = useState(true);
  const [isVideo, setIsVideo] = useState(false);
  // Stores the original WebM File for export — File.type is always "video/webm"
  // so readAsDataURL always produces data:video/webm;base64,… that isVideoSkin() recognises.
  const videoFileRef = useRef<File | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Always clear any previously placed logo when loading a new skin
    setLogoSrc(null);
    logoImgRef.current = null;
    setLogoSelected(false);

    // Detect video by type OR extension — Windows sometimes returns file.type=""
    const name = file.name.toLowerCase();
    const isVideoFile = file.type.startsWith("video/") ||
      name.endsWith(".webm") || name.endsWith(".mp4") || name.endsWith(".mov");

    if (isVideoFile) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsVideo(true);
      setVideoLoop(true);

      // Store the File directly — type is always "video/webm" so export is reliable.
      videoFileRef.current = file;

      const vid = document.createElement("video");
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "auto";

      // onloadeddata fires when the first frame is decoded and ready to display —
      // more reliable than onseeked which can fire before the frame is available.
      vid.onloadeddata = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = vid.videoWidth;
        canvas.height = vid.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(vid, 0, 0);
        try {
          originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch { originalDataRef.current = null; }
        historyRef.current = [];
        setImgDims({ w: vid.videoWidth, h: vid.videoHeight });
        setHasImage(true);
        setZoom(1);
        setSelection(null);
        setCroppedResult(null);
        setBezels([]);
        setSelectedBezel(null);
        vid.remove();
      };

      vid.src = url;
      vid.load();
      e.target.value = "";
      return;
    }

    // Handle image (existing flow)
    setIsVideo(false);
    setVideoUrl(null);
    videoFileRef.current = null;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== "string") return;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [];
        setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
        setHasImage(true);
        setZoom(1);
        setSelection(null);
        setCroppedResult(null);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Magic wand background removal: flood fill from a click point ──
  function magicWandRemove(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const startIdx = (y * w + x) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];
    const tol = tolerance;

    const visited = new Uint8Array(w * h);
    const stack: number[] = [y * w + x];

    while (stack.length) {
      const p = stack.pop()!;
      if (visited[p]) continue;
      visited[p] = 1;
      const px = p % w, py = (p - px) / w;
      const idx = p * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      if (a === 0) continue;
      const diff = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb);
      if (diff > tol * 3) continue;
      data[idx + 3] = 0; // set alpha to 0

      if (px > 0) stack.push(p - 1);
      if (px < w - 1) stack.push(p + 1);
      if (py > 0) stack.push(p - w);
      if (py < h - 1) stack.push(p + w);
    }

    pushHistory();
    ctx.putImageData(imageData, 0, 0);
  }

  // ── Erase / Restore brush ──
  function paintAt(x: number, y: number, mode: "erase" | "restore") {
    const canvas = canvasRef.current;
    const orig = originalDataRef.current;
    if (!canvas || !orig) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const radius = brushSize;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(w - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(h - 1, Math.ceil(y + radius));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - x, dy = py - y;
        if (dx * dx + dy * dy > radius * radius) continue;
        const idx = (py * w + px) * 4;
        if (mode === "erase") {
          data[idx + 3] = 0;
        } else {
          // restore from original
          data[idx] = orig.data[idx];
          data[idx + 1] = orig.data[idx + 1];
          data[idx + 2] = orig.data[idx + 2];
          data[idx + 3] = orig.data[idx + 3];
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function getCanvasCoords(e: React.MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    return { x, y };
  }

  // Unclamped canvas-space coords, used for selection dragging (allows slight overshoot)
  function getRawCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function clampSelection(sel: Selection): Selection {
    const canvas = canvasRef.current;
    if (!canvas) return sel;
    let { x, y, w, h } = sel;
    w = Math.max(4, w);
    h = Math.max(4, h);
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > canvas.width) x = canvas.width - w;
    if (y + h > canvas.height) y = canvas.height - h;
    if (x < 0) { x = 0; w = canvas.width; }
    if (y < 0) { y = 0; h = canvas.height; }
    return { x, y, w, h };
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (!hasImage) return;

    if (tool === "crop-rect" || tool === "crop-circle") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const raw = getRawCanvasCoords(e.clientX, e.clientY);
      // Start a fresh square-ish selection centered near click, default size = 20% of canvas
      const size = Math.round(Math.min(canvas.width, canvas.height) * 0.25);
      const newSel: Selection = clampSelection({
        x: raw.x - size / 2, y: raw.y - size / 2, w: size, h: size,
      });
      setCroppedResult(null);
      setSelection(newSel);
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (tool === "select") {
      // Clicking empty canvas area deselects everything
      setSelectedBezel(null);
      setLogoSelected(false);
      return;
    }
    if (tool === "wand") {
      magicWandRemove(coords.x, coords.y);
    } else {
      pushHistory();
      setIsPainting(true);
      paintAt(coords.x, coords.y, tool === "erase" ? "erase" : "restore");
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    // Track brush cursor position in display (CSS) coords relative to canvas element
    if (tool === "erase" || tool === "restore") {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setBrushPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else {
      setBrushPos(null);
    }
    if (!isPainting) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    paintAt(coords.x, coords.y, tool === "erase" ? "erase" : "restore");
  }

  function handleCanvasMouseUp() {
    setIsPainting(false);
  }

  function beginSelDrag(e: React.MouseEvent, mode: "move" | "resize") {
    if (!selection) return;
    e.stopPropagation();
    e.preventDefault();
    selDragRef.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...selection } };
  }

  // Auto-create a centered selection when a crop tool is activated
  useEffect(() => {
    if ((tool === "crop-rect" || tool === "crop-circle") && hasImage && !selection && !croppedResult) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = Math.round(Math.min(canvas.width, canvas.height) * 0.5);
      setSelection(clampSelection({
        x: (canvas.width - size) / 2, y: (canvas.height - size) / 2, w: size, h: size,
      }));
    }
  }, [tool, hasImage]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = selDragRef.current;
      const canvas = canvasRef.current;
      if (!d || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const dx = (e.clientX - d.startX) * scaleX;
      const dy = (e.clientY - d.startY) * scaleY;

      if (d.mode === "move") {
        setSelection(clampSelection({ x: d.orig.x + dx, y: d.orig.y + dy, w: d.orig.w, h: d.orig.h }));
      } else {
        const newW = Math.max(8, d.orig.w + dx);
        const newH = Math.max(8, d.orig.h + dy);
        setSelection(clampSelection({ x: d.orig.x, y: d.orig.y, w: newW, h: newH }));
      }
    }
    function onUp() { selDragRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Crop canvas to the current selection. For circle mode, also masks pixels outside the circle.
  function applyCrop() {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y, w, h } = selection;
    const sx = Math.round(x), sy = Math.round(y), sw = Math.round(w), sh = Math.round(h);

    const cropped = ctx.getImageData(sx, sy, sw, sh);

    if (tool === "crop-circle") {
      const data = cropped.data;
      const cx = sw / 2, cy = sh / 2;
      const r = Math.min(sw, sh) / 2;
      for (let py = 0; py < sh; py++) {
        for (let px = 0; px < sw; px++) {
          const dx = px - cx + 0.5, dy = py - cy + 0.5;
          if (dx * dx + dy * dy > r * r) {
            const idx = (py * sw + px) * 4;
            data[idx + 3] = 0;
          }
        }
      }
    }

    // Render the crop onto an off-screen canvas — the main canvas/image is left untouched
    // so additional crops (e.g. the other thumbstick) can be made from the same source.
    const off = document.createElement("canvas");
    off.width = sw;
    off.height = sh;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    offCtx.putImageData(cropped, 0, 0);

    setCroppedResult({ url: off.toDataURL("image/png"), w: sw, h: sh });
    setSelection(null);
  }

  function cancelCrop() {
    setSelection(null);
  }

  function discardCroppedResult() {
    setCroppedResult(null);
  }

  // Replace the main canvas with the cropped result (e.g. to erase/restore-touch-up just the crop)
  function useCroppedResultAsMain() {
    const canvas = canvasRef.current;
    const result = croppedResult;
    if (!canvas || !result) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = result.w;
      canvas.height = result.h;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [];
      setImgDims({ w: result.w, h: result.h });
      setCroppedResult(null);
      setTool("erase");
    };
    img.src = result.url;
  }

  function bakeBezels(ctx: CanvasRenderingContext2D, done: () => void) {
    if (bezels.length === 0) { done(); return; }
    let loaded = 0;
    for (const bz of bezels) {
      const img = new Image();
      img.onload = () => {
        const x = bz.x - bz.size/2, y = bz.y - bz.size/2;
        // Draw original bezel
        ctx.save();
        ctx.drawImage(img, x, y, bz.size, bz.size);
        // Multiply tint — overlay color rect with multiply blend
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = bz.color;
        ctx.fillRect(x, y, bz.size, bz.size);
        ctx.restore();
        loaded++;
        if (loaded === bezels.length) done();
      };
      img.src = BEZEL_URL;
    }
  }

  function handleCanvasDropBezel(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.getData("bezel") !== "1") return;
    if (!hasImage || bezels.length >= 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const size = Math.round(Math.min(canvas.width, canvas.height) * 0.15);
    const id = bezelNextId.current++;
    setBezels(prev => [...prev, { id, x: cx, y: cy, size, color: "#ffffff" }]);
    setSelectedBezel(id);
  }

  function beginBezelDrag(e: React.MouseEvent, id: number, mode: "move" | "resize") {
    e.stopPropagation();
    const bz = bezels.find(b => b.id === id);
    if (!bz) return;
    bezelDragRef.current = { id, mode, startX: e.clientX, startY: e.clientY, origX: bz.x, origY: bz.y, origSize: bz.size };
    setSelectedBezel(id);
    const onMove = (ev: MouseEvent) => {
      const d = bezelDragRef.current;
      if (!d) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const dx = (ev.clientX - d.startX) * scaleX;
      const dy = (ev.clientY - d.startY) * scaleY;
      setBezels(prev => prev.map(b => {
        if (b.id !== d.id) return b;
        if (d.mode === "move") return { ...b, x: d.origX + dx, y: d.origY + dy };
        const delta = (dx + dy) / 2;
        return { ...b, size: Math.max(20, d.origSize + delta) };
      }));
    };
    const onUp = () => { bezelDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function removeBezel(id: number) {
    setBezels(prev => prev.filter(b => b.id !== id));
    if (selectedBezel === id) setSelectedBezel(null);
  }

  function updateBezelColor(id: number, color: string) {
    setBezels(prev => prev.map(b => b.id === id ? { ...b, color } : b));
  }

  /** Encode a new WebM with the logo composited onto every frame via MediaRecorder. */
  async function handleBakeLogoToWebM() {
    if (!videoFileRef.current || !logoSrc || !logoImgRef.current) return;

    const gl   = webglRef.current;
    const prog = glProgramRef.current;
    const glCv = webglCanvasRef.current;
    if (!gl || !prog || !glCv) { console.error("WebGL not ready"); return; }

    setIsEncoding(true);
    setEncodingProgress(0);

    // Snapshot all logo settings (same values the WebGL useEffect uses)
    const logo   = logoImgRef.current;
    const { x, y, w, h, rot } = logoPos;
    const lcx    = x + w / 2, lcy = y + h / 2;
    const rotRad = (rot * Math.PI) / 180;
    const snap = {
      opacity: logoOpacity, blendMode: logoBlendMode, blur: logoBlur,
      biThisShLo, biThisShHi, biThisHiLo, biThisHiHi,
      biUndShLo,  biUndShHi,  biUndHiLo,  biUndHiHi,
      dispX, dispY,
    };

    try {
      const srcUrl = URL.createObjectURL(videoFileRef.current);

      const blob = await new Promise<Blob>((resolve, reject) => {
        const vid = document.createElement("video");
        vid.muted = true; vid.playsInline = true;

        vid.onloadedmetadata = () => {
          const W = vid.videoWidth, H = vid.videoHeight;
          const duration = vid.duration;

          // Pre-render logo to logoCv — same as useEffect does
          const logoCv = document.createElement("canvas");
          logoCv.width = W; logoCv.height = H;
          const lctx = logoCv.getContext("2d")!;
          lctx.save();
          lctx.translate(lcx, lcy);
          lctx.rotate(rotRad);
          if (snap.blur > 0) lctx.filter = `blur(${snap.blur}px)`;
          lctx.drawImage(logo, -w / 2, -h / 2, w, h);
          lctx.restore();

          const offscreen = document.createElement("canvas");
          offscreen.width = W; offscreen.height = H;
          const ctx = offscreen.getContext("2d")!;

          // Render one frame — mirrors the WebGL useEffect exactly, using vid as surface
          const renderFrame = (t: number) => {
            const ul = (n: string) => gl.getUniformLocation(prog, n);
            const mkTex = (unit: number, src: TexImageSource) => {
              const tx = gl.createTexture()!;
              gl.activeTexture(gl.TEXTURE0 + unit);
              gl.bindTexture(gl.TEXTURE_2D, tx);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
              return tx;
            };

            try {
              glCv.width = W; glCv.height = H;
              gl.viewport(0, 0, W, H);
              gl.useProgram(prog);

              const surfTex = mkTex(0, vid);
              const logoTex = mkTex(1, logoCv);

              gl.uniform1i(ul("u_surface"),   0);
              gl.uniform1i(ul("u_logo"),      1);
              gl.uniform2f(ul("u_res"),       W, H);
              gl.uniform1f(ul("u_opacity"),   snap.opacity);
              gl.uniform1i(ul("u_blendMode"), BLEND_MODE_IDX[snap.blendMode] ?? 0);
              gl.uniform4f(ul("u_biThis"),    snap.biThisShLo/255, snap.biThisShHi/255, snap.biThisHiLo/255, snap.biThisHiHi/255);
              gl.uniform4f(ul("u_biUnd"),     snap.biUndShLo/255,  snap.biUndShHi/255,  snap.biUndHiLo/255,  snap.biUndHiHi/255);
              gl.uniform2f(ul("u_disp"),      snap.dispX, snap.dispY);

              const buf = gl.createBuffer()!;
              gl.bindBuffer(gl.ARRAY_BUFFER, buf);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
              const posLoc = gl.getAttribLocation(prog, "a_pos");
              gl.enableVertexAttribArray(posLoc);
              gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
              gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

              ctx.clearRect(0, 0, W, H);
              ctx.drawImage(glCv, 0, 0);

              gl.deleteTexture(surfTex);
              gl.deleteTexture(logoTex);
              gl.deleteBuffer(buf);
            } catch {
              // 2D fallback
              ctx.clearRect(0, 0, W, H);
              ctx.drawImage(vid, 0, 0, W, H);
              ctx.save();
              ctx.globalAlpha = snap.opacity;
              ctx.translate(lcx, lcy); ctx.rotate(rotRad);
              ctx.drawImage(logo, -w / 2, -h / 2, w, h);
              ctx.restore();
            }
            setEncodingProgress(Math.min(1, t / duration));
          };

          // Seek to frame 0, draw it before recorder starts
          vid.currentTime = 0;
          vid.onseeked = () => {
            vid.onseeked = null;
            renderFrame(0);

            const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
              ? "video/webm;codecs=vp9" : "video/webm";
            const stream   = offscreen.captureStream();
            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });

            const chunks: Blob[] = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
              URL.revokeObjectURL(srcUrl);
              vid.remove();
              resolve(new Blob(chunks, { type: "video/webm" }));
            };

            let done = false, lastTime = -1;
            let rafId: number;

            const onRVFC = (_: number, meta: { mediaTime: number }) => {
              if (done) return;
              const t = meta.mediaTime;
              if (lastTime > 0.5 && t < lastTime - 0.5) { done = true; recorder.stop(); return; }
              lastTime = t; renderFrame(t);
              (vid as any).requestVideoFrameCallback(onRVFC);
            };
            const onRAF = () => {
              if (done) return;
              const t = vid.currentTime;
              if (lastTime > 0.5 && t < lastTime - 0.5) { done = true; cancelAnimationFrame(rafId); recorder.stop(); return; }
              lastTime = t; renderFrame(t);
              rafId = requestAnimationFrame(onRAF);
            };

            vid.onended = () => { if (!done) { done = true; cancelAnimationFrame(rafId); recorder.stop(); } };
            vid.onerror = () => reject(new Error("Encoding playback error"));

            recorder.start(100);
            vid.loop = true;
            vid.play().then(() => {
              if ("requestVideoFrameCallback" in vid) (vid as any).requestVideoFrameCallback(onRVFC);
              else rafId = requestAnimationFrame(onRAF);
            }).catch(reject);
          };
        };

        vid.onerror = () => reject(new Error("Failed to load video for encoding"));
        vid.src = srcUrl;
      });

      const newFile = new File([blob], "baked-skin.webm", { type: "video/webm" });
      videoFileRef.current = newFile;
      const newUrl = URL.createObjectURL(blob);
      setVideoUrl(newUrl); setIsVideo(true);

      const pv = document.createElement("video");
      pv.muted = true; pv.playsInline = true;
      pv.onloadeddata = () => {
        const c = canvasRef.current;
        if (c) { c.width = pv.videoWidth; c.height = pv.videoHeight; c.getContext("2d")?.drawImage(pv, 0, 0); }
        pv.remove();
      };
      pv.src = newUrl;

      setLogoSrc(null); logoImgRef.current = null; setLogoSelected(false);

      // Store baked URL in local state so the Controller Body card updates instantly —
      // this avoids a dependency on Studio's config prop cycle (which is async).
      // Always target controllerSkin + active controller regardless of exportSlot selection.
      setBakedWebmUrl(newUrl);
      confirmExport(newUrl, "controllerSkin", activeControllerType);

    } catch (err) {
      console.error("WebM encoding failed:", err);
    }

    setIsEncoding(false);
    setEncodingProgress(0);
  }

  function confirmExport(dataUrl: string, slot: ExportSlot, target: ControllerType) {
    onExportToSkin(dataUrl, slot, target);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 1500);
  }

  function handleExportToSkin() {
    const source = canvasRef.current;
    if (!source || !hasImage) return;

    // If logo is placed: export the WebGL display canvas as PNG — same as PNG workflow.
    // Baking a logo always produces a static composite regardless of skin type.
    if (logoSrc && logoImgRef.current) {
      const display = displayCanvasRef.current;
      if (display) {
        try {
          const dataUrl = display.toDataURL("image/png");
          setLogoSrc(null); logoImgRef.current = null; setLogoSelected(false);
          setIsVideo(false); setVideoUrl(null); videoFileRef.current = null;
          confirmExport(dataUrl, exportSlot, exportTarget);
          return;
        } catch { /* canvas tainted — use fallback */ }
      }
      // Fallback: composite surface + logo on a fresh untainted canvas
      const W = source.width, H = source.height;
      const ec = document.createElement("canvas"); ec.width = W; ec.height = H;
      const ectx = ec.getContext("2d")!;
      const vidEl = videoEditRef.current;
      if (isVideo && vidEl && vidEl.readyState >= 2) ectx.drawImage(vidEl, 0, 0, W, H);
      else ectx.drawImage(source, 0, 0);
      const { x, y, w, h, rot } = logoPos;
      ectx.save(); ectx.globalAlpha = logoOpacity;
      ectx.translate(x + w/2, y + h/2); ectx.rotate((rot * Math.PI) / 180);
      if (logoBlur > 0) ectx.filter = `blur(${logoBlur}px)`;
      ectx.drawImage(logoImgRef.current, -w/2, -h/2, w, h); ectx.restore();
      setLogoSrc(null); logoImgRef.current = null; setLogoSelected(false);
      setIsVideo(false); setVideoUrl(null); videoFileRef.current = null;
      confirmExport(ec.toDataURL("image/png"), exportSlot, exportTarget);
      return;
    }

    // No logo — export WebM as blob URL (avoids base64 quota crash in localStorage).
    // ControllerPreview plays blob: URLs the same as data: URLs.
    const hasWebM = videoFileRef.current || (isVideo && videoUrl);
    if (hasWebM) {
      window.dispatchEvent(new CustomEvent("bezel-video-loop", { detail: { loop: videoLoop } }));
      if (videoFileRef.current) {
        const blobUrl = URL.createObjectURL(videoFileRef.current);
        confirmExport(blobUrl, exportSlot, exportTarget);
      } else {
        confirmExport(videoUrl!, exportSlot, exportTarget);
      }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (bezels.length === 0) {
      const url = croppedResult ? croppedResult.url : canvas.toDataURL("image/png");
      confirmExport(url, exportSlot, exportTarget);
      return;
    }
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width; tmp.height = canvas.height;
    const tctx = tmp.getContext("2d")!;
    if (croppedResult) {
      const img = new Image();
      img.onload = () => {
        tctx.drawImage(img, 0, 0);
        bakeBezels(tctx, () => confirmExport(tmp.toDataURL("image/png"), exportSlot, exportTarget));
      };
      img.src = croppedResult.url;
    } else {
      tctx.drawImage(canvas, 0, 0);
      bakeBezels(tctx, () => confirmExport(tmp.toDataURL("image/png"), exportSlot, exportTarget));
    }
  }

  const SLOT_LABELS: Record<ExportSlot, string> = {
    controllerSkin: "Controller Body",
    leftStickSkin: "Left Thumbstick",
    rightStickSkin: "Right Thumbstick",
  };

  // Checkerboard background pattern for transparency visualization
  const checkerStyle: React.CSSProperties = {
    backgroundImage:
      "linear-gradient(45deg, #2a2a35 25%, transparent 25%), linear-gradient(-45deg, #2a2a35 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a35 75%), linear-gradient(-45deg, transparent 75%, #2a2a35 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    backgroundColor: "#1a1a22",
  };

  return (
    <div className="flex h-full min-h-0 border-2 border-black rounded-lg overflow-hidden">
      {/* Left sidebar: per-slot preview boxes + export controls */}
      <div className="flex-none w-[220px] flex flex-col gap-3 p-3 border-r-2 border-black bg-card/30 overflow-y-auto">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {CONTROLLER_TYPES.find(c => c.id === exportTarget)?.label ?? "Target"} Skins
        </span>

        {(Object.entries(SLOT_LABELS) as [ExportSlot, string][]).map(([slotKey, label]) => {
          const isActive = exportTarget === activeControllerType;
          // For the Controller Body slot, prefer the locally-tracked baked URL so the
          // card updates immediately without waiting on the Studio→props round-trip.
          const configValue = isActive ? activeConfig[slotKey] : pendingSkins[exportTarget]?.[slotKey];
          const value = (slotKey === "controllerSkin" && bakedWebmUrl) ? bakedWebmUrl : configValue;
          const filled = !!value && (isActive ? (value.startsWith("data:") || value.startsWith("blob:")) : true);
          const isSelected = exportSlot === slotKey;

          const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (slotKey === "controllerSkin") setBakedWebmUrl(null);
            onClearSlot(slotKey, exportTarget);
          };

          return (
            <button key={slotKey} onClick={() => setExportSlot(slotKey)}
              className={`relative flex flex-col gap-1 text-left rounded-lg border-2 p-2 transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
              <span className="text-xs font-medium text-foreground/80">{label}</span>
              <div className="relative w-full h-24 rounded-md overflow-hidden border border-border" style={checkerStyle}>
                {filled && value ? (
                  (value.startsWith("data:video/") || value.startsWith("blob:")) ? (
                    <>
                      <video src={value} autoPlay loop muted playsInline
                        className="w-full h-full object-contain" />
                      <div style={{position:"absolute",top:3,left:3,fontSize:9,background:"rgba(109,40,217,0.85)",color:"#fff",padding:"1px 5px",borderRadius:3,fontWeight:600,pointerEvents:"none"}}>
                        🎬 WebM
                      </div>
                    </>
                  ) : (
                    <img src={value} alt={label} className="w-full h-full object-contain" />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon size={20} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${filled ? "text-primary" : "text-muted-foreground/50"}`}>
                  {filled ? <><Check size={9} className="inline mr-0.5" />Ready</> : "Empty"}
                </span>
                {filled && (
                  <button
                    onClick={handleClear}
                    title="Reset slot to default"
                    className="flex items-center gap-0.5 text-[9px] text-muted-foreground/60 hover:text-destructive transition-colors px-1 py-0.5 rounded hover:bg-destructive/10">
                    <X size={9} /> Reset
                  </button>
                )}
              </div>
            </button>
          );
        })}

        {/* Analog Bezel section */}
        <div className="border-t border-border pt-2 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Analog Bezel</span>
          <div
            draggable={hasImage && bezels.length < 2}
            onDragStart={e => e.dataTransfer.setData("bezel", "1")}
            className={`rounded-lg border-2 p-2 flex flex-col items-center gap-1.5 transition-all ${hasImage && bezels.length < 2 ? "border-border hover:border-primary/60 cursor-grab" : "border-border/30 opacity-40 cursor-not-allowed"}`}
            title={bezels.length >= 2 ? "Max 2 bezels on canvas" : "Drag onto image to place"}>
            <img src={BEZEL_URL} alt="Analog Bezel" className="w-14 h-14 object-contain" />
            <span className="text-[10px] text-muted-foreground">{bezels.length >= 2 ? "Max placed" : "Drag to place"}</span>
          </div>
          {bezels.map(bz => (
            <div key={bz.id} className={`rounded-md border p-2 space-y-1.5 transition-all cursor-pointer ${selectedBezel === bz.id ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => setSelectedBezel(bz.id)}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-foreground/80">Bezel {bz.id + 1}</span>
                <button onClick={e => { e.stopPropagation(); removeBezel(bz.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"><X size={10} /></button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Color</span>
                <input type="color" value={bz.color} onChange={e => updateBezelColor(bz.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-8 h-5 rounded cursor-pointer border border-border bg-transparent" />
                <span className="text-[10px] text-muted-foreground font-mono">{bz.color}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="space-y-1.5 pt-2 border-t border-border">
          <label className="text-[10px] text-muted-foreground">Target Controller</label>
          <select value={exportTarget} onChange={e => setExportTargetOverride(e.target.value as ControllerType)}
            className="w-full text-xs px-2 py-1.5 rounded-md bg-card border border-border text-foreground">
            {CONTROLLER_TYPES.map(ct => (
              <option key={ct.id} value={ct.id}>{ct.label}</option>
            ))}
          </select>
          {isVideo && (
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-muted-foreground">Loop video</span>
              <div onClick={() => setVideoLoop(l => !l)}
                className={`relative w-8 h-4 rounded-full transition-colors ${videoLoop ? "bg-primary" : "bg-border"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${videoLoop ? "left-4" : "left-0.5"}`} />
              </div>
            </label>
          )}
          <p className="text-[10px] text-muted-foreground">
            Send {croppedResult ? "cropped result" : "full image"} as <span className="text-foreground/80">{SLOT_LABELS[exportSlot]}</span>
          </p>
          <button onClick={handleExportToSkin} disabled={!hasImage}
            className={`flex items-center justify-center gap-1.5 w-full text-xs px-2.5 py-2 rounded-md font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${exportDone ? "bg-green-600 text-white" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            <ArrowRightCircle size={12} /> {exportDone ? "✓ Exported!" : "Export to Skin Slot"}
          </button>
        </div>
      </div>

      {/* Right: toolbar + canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex-none flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60 flex-wrap">
        <input ref={fileInputRef} type="file" accept="image/png,image/webp,image/jpeg,video/webm" className="hidden" onChange={handleFile} />

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          <button onClick={() => setTool("select")} title="Select: click to select bezels or logo"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${tool === "select" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <MousePointer size={12} /> Select
          </button>
          <button onClick={() => setTool("wand")} title="Magic wand: click to remove background color"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${tool === "wand" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Wand2 size={12} /> Wand
          </button>
          <button onClick={() => setTool("erase")} title="Erase brush: paint to remove"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${tool === "erase" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Eraser size={12} /> Erase
          </button>
          <button onClick={() => setTool("restore")} title="Restore brush: paint to bring back original pixels"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${tool === "restore" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Paintbrush size={12} /> Restore
          </button>
          <button onClick={() => { setTool("crop-rect"); setSelection(null); }} title="Rectangle crop"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${tool === "crop-rect" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Square size={12} /> Crop
          </button>
          <button onClick={() => { setTool("crop-circle"); setSelection(null); }} title="Circle crop (for thumbsticks)"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${tool === "crop-circle" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Circle size={12} /> Circle
          </button>
        </div>

        {(tool === "crop-rect" || tool === "crop-circle") && selection && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {Math.round(selection.w)} × {Math.round(selection.h)} px
            </span>
            <button onClick={applyCrop}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all">
              <Check size={12} /> Apply Crop
            </button>
            <button onClick={cancelCrop}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground transition-all">
              <X size={12} /> Cancel
            </button>
          </div>
        )}

        {croppedResult && (
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-md px-2 py-1">
            <img src={croppedResult.url} alt="Crop result" className="w-6 h-6 object-contain" style={{
              backgroundImage: "linear-gradient(45deg, #2a2a35 25%, transparent 25%), linear-gradient(-45deg, #2a2a35 25%, transparent 25%)",
              backgroundSize: "6px 6px",
            }} />
            <span className="text-[10px] text-muted-foreground">{croppedResult.w} × {croppedResult.h} px ready</span>
            <button onClick={useCroppedResultAsMain} title="Edit this crop further (erase/restore)"
              className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-all">
              Edit
            </button>
            <button onClick={discardCroppedResult} title="Discard this crop"
              className="text-muted-foreground hover:text-destructive transition-colors">
              <X size={12} />
            </button>
          </div>
        )}

        {tool === "wand" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Tolerance</span>
            <input type="range" min={1} max={100} value={tolerance} onChange={e => setTolerance(Number(e.target.value))}
              className="w-24 accent-primary h-1.5 rounded-full cursor-pointer" />
            <span className="text-[10px] font-mono text-foreground/60 w-6">{tolerance}</span>
          </div>
        )}
        {(tool === "erase" || tool === "restore") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Brush size</span>
            <input type="range" min={4} max={80} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))}
              className="w-24 accent-primary h-1.5 rounded-full cursor-pointer" />
            <span className="text-[10px] font-mono text-foreground/60 w-6">{brushSize}</span>
          </div>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <button onClick={undo} disabled={!hasImage || historyRef.current.length === 0}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <Undo2 size={12} /> Undo
        </button>
        <button onClick={resetToOriginal} disabled={!hasImage}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <RotateCcw size={12} /> Reset
        </button>
        <button onClick={() => {
          setHasImage(false);
          setIsVideo(false);
          setVideoUrl(null);
          videoFileRef.current = null;
          setImgDims(null);
          setZoom(1);
          setSelection(null);
          setCroppedResult(null);
          setBezels([]);
          setSelectedBezel(null);
          setLogoSrc(null);
          logoImgRef.current = null;
          historyRef.current = [];
          originalDataRef.current = null;
          const canvas = canvasRef.current;
          if (canvas) { const ctx = canvas.getContext("2d"); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
        }} disabled={!hasImage}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-card border border-destructive/40 hover:border-destructive hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <X size={12} /> Clear
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-1.5">
          <ZoomOut size={12} className="text-muted-foreground flex-none" />
          <input type="range" min={10} max={400} step={5} value={Math.round(zoom * 100)}
            onChange={e => setZoom(Number(e.target.value) / 100)}
            disabled={!hasImage}
            className="w-28 h-1.5 accent-primary cursor-pointer disabled:opacity-40" />
          <ZoomIn size={12} className="text-muted-foreground flex-none" />
          <span className="text-[10px] font-mono text-foreground/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex-1" />
      </div>

      {/* Canvas area */}
      <div ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center min-h-0 border-2 border-r-8 border-black m-2 rounded-md"
        style={checkerStyle}
        onDragOver={e => e.preventDefault()}
        onDrop={handleCanvasDropBezel}
        onMouseDown={e => { if (e.target === e.currentTarget) setSelectedBezel(null); }}>
        {!hasImage && (
          <button onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-12 border-2 border-dashed border-border rounded-xl hover:border-primary/40">
            <ImageIcon size={32} />
            <span className="text-sm">Upload a PNG or WebM to start editing</span>
          </button>
        )}
        <div className="relative" style={{
          display: hasImage ? "block" : "none",
          width: imgDims ? `${imgDims.w * zoom}px` : undefined,
          height: imgDims ? `${imgDims.h * zoom}px` : undefined,
        }}>
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: imgDims ? `${imgDims.w * zoom}px` : undefined,
              height: imgDims ? `${imgDims.h * zoom}px` : undefined,
              imageRendering: zoom > 1 ? "pixelated" : "auto",
              cursor: tool === "select" ? "default" : tool === "wand" ? "crosshair" : (tool === "crop-rect" || tool === "crop-circle") ? "crosshair" : "none",
              visibility: logoSrc ? "hidden" : "visible",
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => { handleCanvasMouseUp(); setBrushPos(null); }}
          />

          {/* Display canvas — shows logo composite when logo is active */}
          {logoSrc && (
            <canvas
              ref={displayCanvasRef}
              style={{
                display: "block",
                position: "absolute",
                inset: 0,
                width: imgDims ? `${imgDims.w * zoom}px` : undefined,
                height: imgDims ? `${imgDims.h * zoom}px` : undefined,
                imageRendering: zoom > 1 ? "pixelated" : "auto",
                cursor: logoSelected ? "move" : "crosshair",
                zIndex: 11,
              }}
              onMouseDown={handleDisplayMouseDown}
              onMouseMove={handleDisplayMouseMove}
              onMouseUp={handleDisplayMouseUp}
              onMouseLeave={handleDisplayMouseUp}
            />
          )}

          {/* Logo selection handles — SVG overlay, never part of toDataURL() */}
          {logoSrc && logoSelected && imgDims && (() => {
            const { x, y, w, h, rot } = logoPos;
            const lcx = (x + w / 2) * zoom;
            const lcy = (y + h / 2) * zoom;
            const dw = w * zoom; const dh = h * zoom;
            return (
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 12, pointerEvents: "none" }}>
                <g transform={`translate(${lcx},${lcy}) rotate(${rot})`}>
                  <rect x={-dw/2} y={-dh/2} width={dw} height={dh}
                    fill="none" stroke="#e40707" strokeWidth={1.5} strokeDasharray="6 3" />
                  <circle cx={dw/2} cy={dh/2} r={6} fill="#fff" stroke="#e40707" strokeWidth={1.5} style={{ pointerEvents: "auto", cursor: "se-resize" }}
                    onMouseDown={e => { e.stopPropagation(); logoDragRef.current = { mode: "resize", startX: e.clientX, startY: e.clientY, origPos: { ...logoPos } }; window.addEventListener("mousemove", onLogoMouseMove); window.addEventListener("mouseup", onLogoMouseUp); }} />
                  <line x1={0} y1={-dh/2} x2={0} y2={-dh/2 - 14} stroke="#e40707" strokeWidth={1.5} />
                  <circle cx={0} cy={-dh/2 - 20} r={6} fill="#fff" stroke="#e40707" strokeWidth={1.5} style={{ pointerEvents: "auto", cursor: "grab" }}
                    onMouseDown={e => { e.stopPropagation(); logoDragRef.current = { mode: "rotate", startX: e.clientX, startY: e.clientY, origPos: { ...logoPos }, startAngle: logoPos.rot }; window.addEventListener("mousemove", onLogoMouseMove); window.addEventListener("mouseup", onLogoMouseUp); }} />
                </g>
              </svg>
            );
          })()}

          {/* Video element kept hidden — used only for WebGL texture upload.
              The canvas displays the captured first frame so all tools work
              identically to PNG. No z-index conflicts. */}
          {isVideo && videoUrl && hasImage && (
            <video
              ref={videoEditRef}
              src={videoUrl}
              autoPlay
              loop={videoLoop}
              muted
              playsInline
              style={{ display: "none" }}
            />
          )}

          {/* WebM mode badge */}
          {isVideo && (
            <div style={{
              position: "absolute", top: 6, right: 6,
              background: videoFileRef.current ? "rgba(22,163,74,0.9)" : "rgba(220,38,38,0.9)",
              color: "#fff",
              fontSize: 10, padding: "2px 8px", borderRadius: 4,
              pointerEvents: "none", fontWeight: 600,
            }}>
              {videoFileRef.current ? "🎬 WebM ready — exports as animated" : "⚠️ WebM not tracked — re-upload to export as animated"}
            </div>
          )}
          {/* Encoding progress overlay — styled to match the "no controller detected" card */}
          {isEncoding && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.72)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                background: "rgba(10,10,14,0.92)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "16px",
                padding: "22px 32px",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
                textAlign: "center",
                minWidth: "260px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              }}>
                {/* Animated logo loops while encoding */}
                <video
                  src="/logoanimation.webm"
                  autoPlay loop muted playsInline
                  style={{ width: 180, height: "auto", display: "block" }}
                />
                {/* Progress bar */}
                <div style={{ width: "100%", background: "rgba(255,255,255,0.10)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{
                    width: `${encodingProgress * 100}%`,
                    background: "linear-gradient(90deg,#e40707,#ff6b35)",
                    height: "100%", borderRadius: 4,
                    transition: "width 0.1s linear",
                  }} />
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                  {Math.round(encodingProgress * 100)}% — baking logo into WebM…
                </p>
              </div>
            </div>
          )}
          {brushPos && (tool === "erase" || tool === "restore") && (
            <div style={{
              position: "absolute",
              left: brushPos.x - (brushSize * zoom) / 2,
              top: brushPos.y - (brushSize * zoom) / 2,
              width: brushSize * zoom,
              height: brushSize * zoom,
              border: `2px solid ${tool === "erase" ? "#ff4444" : "#44ff88"}`,
              borderRadius: "50%",
              pointerEvents: "none",
              boxShadow: `0 0 0 1px rgba(0,0,0,0.5)`,
            }} />
          )}

          {/* Bezel overlays */}
          {bezels.map(bz => {
            const dispX = (bz.x - bz.size/2) * zoom;
            const dispY = (bz.y - bz.size/2) * zoom;
            const dispSize = bz.size * zoom;
            const isSelected = selectedBezel === bz.id;
            return (
              <div key={bz.id}
                onMouseDown={e => { e.stopPropagation(); beginBezelDrag(e, bz.id, "move"); }}
                style={{
                  position: "absolute",
                  left: `${dispX}px`, top: `${dispY}px`,
                  width: `${dispSize}px`, height: `${dispSize}px`,
                  cursor: "move",
                  outline: isSelected ? "2px solid #e40707" : "none",
                  outlineOffset: "2px",
                }}>
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <img src={BEZEL_URL} alt="bezel"
                    style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
                  {/* Color tint overlay using multiply blend, clipped to circle */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: bz.color,
                    mixBlendMode: "multiply",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }} />
                </div>
                {/* Handles always present but only visible when selected */}
                <div onMouseDown={e => { e.stopPropagation(); beginBezelDrag(e, bz.id, "resize"); }}
                  style={{
                    position: "absolute", right: -6, bottom: -6,
                    width: 14, height: 14, background: "#fff",
                    border: "2px solid #e40707", borderRadius: "50%",
                    cursor: "se-resize",
                    opacity: isSelected ? 1 : 0,
                    pointerEvents: isSelected ? "auto" : "none",
                    transition: "opacity 0.15s",
                  }} />
                <div onMouseDown={e => { e.stopPropagation(); removeBezel(bz.id); }}
                  style={{
                    position: "absolute", right: -6, top: -6,
                    width: 16, height: 16, background: "#e40707",
                    borderRadius: "50%", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#fff", fontWeight: "bold",
                    opacity: isSelected ? 1 : 0,
                    pointerEvents: isSelected ? "auto" : "none",
                    transition: "opacity 0.15s",
                  }}>✕</div>
              </div>
            );
          })}
          {selection && (tool === "crop-rect" || tool === "crop-circle") && (
            <div
              onMouseDown={(e) => beginSelDrag(e, "move")}
              style={{
                position: "absolute",
                left: `${selection.x * zoom}px`,
                top: `${selection.y * zoom}px`,
                width: `${selection.w * zoom}px`,
                height: `${selection.h * zoom}px`,
                border: "2px dashed #fff",
                borderRadius: tool === "crop-circle" ? "50%" : "0",
                background: "rgba(255,255,255,0.08)",
                cursor: "move",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
              }}
            >
              <div
                onMouseDown={(e) => beginSelDrag(e, "resize")}
                style={{
                  position: "absolute",
                  right: "-6px",
                  bottom: "-6px",
                  width: "14px",
                  height: "14px",
                  background: "#fff",
                  border: "2px solid #db0606",
                  borderRadius: "50%",
                  cursor: "se-resize",
                }}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Right sidebar: Logo Placement */}
      <div className="flex-none w-[240px] flex flex-col border-l-2 border-black bg-card/30 overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Logo Placement</p>
          <button onClick={() => logoFileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all">
            <Upload size={12} /> Upload Logo PNG
          </button>
          <input ref={logoFileInputRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={handleLogoFile} />
          {logoSrc && (
            <button onClick={() => { setLogoSrc(null); logoImgRef.current = null; setLogoSelected(false); }}
              className="mt-1.5 w-full text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all">
              Remove Logo
            </button>
          )}
        </div>

        {logoSrc ? (
          <div className="flex flex-col gap-0 p-0 text-[10px]">

            {/* ── Layer Blend Mode ─────────────────────────────────────── */}
            <Section label="Layer Blend Mode">
              <select value={logoBlendMode} onChange={e => setLogoBlendMode(e.target.value as BlendModeId)}
                className="w-full text-xs px-2 py-1.5 rounded-md bg-card border border-border text-foreground mb-2">
                {BLEND_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <NumRow label="Opacity" value={Math.round(logoOpacity * 100)} unit="%" min={1} max={100}
                onChange={v => setLogoOpacity(v / 100)} step={1} />
            </Section>

            {/* ── Blend If ─────────────────────────────────────────────── */}
            <Section label="Blend If — This Layer (Logo)">
              <p className="text-muted-foreground/60 mb-1.5 leading-snug">
                Each range: <b className="text-foreground/40">Start → End</b> (feather). Equal = hard edge.
              </p>
              <DualRow label="Shadows" lo={biThisShLo} hi={biThisShHi}
                setLo={v => setBiThisShLo(Math.min(v, biThisShHi))} setHi={v => setBiThisShHi(Math.max(v, biThisShLo))} />
              <DualRow label="Highlights" lo={biThisHiLo} hi={biThisHiHi}
                setLo={v => setBiThisHiLo(Math.min(v, biThisHiHi))} setHi={v => setBiThisHiHi(Math.max(v, biThisHiLo))} />
            </Section>

            <Section label="Blend If — Underlying Layer (Surface)">
              <DualRow label="Shadows" lo={biUndShLo} hi={biUndShHi}
                setLo={v => setBiUndShLo(Math.min(v, biUndShHi))} setHi={v => setBiUndShHi(Math.max(v, biUndShLo))} />
              <DualRow label="Highlights" lo={biUndHiLo} hi={biUndHiHi}
                setLo={v => setBiUndHiLo(Math.min(v, biUndHiHi))} setHi={v => setBiUndHiHi(Math.max(v, biUndHiLo))} />
            </Section>

            {/* ── Displacement ──────────────────────────────────────────── */}
            <Section label="Displacement Map">
              <NumRow label="Horizontal" value={dispX} unit="px" min={0} max={60} step={0.5} onChange={setDispX} />
              <NumRow label="Vertical"   value={dispY} unit="px" min={0} max={60} step={0.5} onChange={setDispY} />
              <p className="text-muted-foreground/40 leading-snug mt-1">
                Warps logo along surface Sobel gradient. Start with 5–10.
              </p>
            </Section>

            {/* ── Surface Softening ─────────────────────────────────────── */}
            <Section label="Surface Softening">
              <NumRow label="Logo Blur" value={logoBlur} unit="px" min={0} max={8} step={0.1} onChange={setLogoBlur} />
              <p className="text-muted-foreground/40 leading-snug mt-1">
                Slight blur (0.5–1.5px) removes the "digital sticker" edge.
              </p>
            </Section>

            {/* ── Placement ─────────────────────────────────────────────── */}
            <Section label="Placement">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1.5">
                {([["X", logoPos.x, (v: number) => setLogoPos(p => ({ ...p, x: v }))],
                   ["Y", logoPos.y, (v: number) => setLogoPos(p => ({ ...p, y: v }))]] as const).map(([l, val, set]) => (
                  <label key={l} className="flex items-center gap-1">
                    <span className="text-muted-foreground w-3">{l}</span>
                    <input type="number" value={Math.round(val as number)}
                      onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                      className="flex-1 min-w-0 text-[10px] bg-muted/30 border border-border rounded px-1 py-0.5 text-right" />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1.5">
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground w-3">W</span>
                  <input type="number" value={Math.round(logoPos.w)}
                    onChange={e => {
                      const nw = Number(e.target.value);
                      setLogoPos(p => ({ ...p, w: nw, h: lockAspect ? Math.round(nw * p.h / (p.w || 1)) : p.h }));
                    }}
                    className="flex-1 min-w-0 text-[10px] bg-muted/30 border border-border rounded px-1 py-0.5 text-right" />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground w-3">H</span>
                  <input type="number" value={Math.round(logoPos.h)}
                    onChange={e => {
                      const nh = Number(e.target.value);
                      setLogoPos(p => ({ ...p, h: nh, w: lockAspect ? Math.round(nh * p.w / (p.h || 1)) : p.w }));
                    }}
                    className="flex-1 min-w-0 text-[10px] bg-muted/30 border border-border rounded px-1 py-0.5 text-right" />
                </label>
              </div>
              <label className="flex items-center gap-1.5 mb-2 cursor-pointer">
                <input type="checkbox" checked={lockAspect} onChange={e => setLockAspect(e.target.checked)}
                  className="accent-primary" />
                <span className="text-muted-foreground">Lock aspect ratio</span>
              </label>
              <NumRow label="Rotation" value={Math.round(logoPos.rot)} unit="°" min={0} max={360} step={1}
                onChange={v => setLogoPos(p => ({ ...p, rot: v }))} />
            </Section>

            <div className="p-3">
              <button onClick={bakeLogoToCanvas}
                className="w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all mb-2">
                <Check size={12} /> Bake to Canvas (PNG)
              </button>
              {videoFileRef.current && (
                <button onClick={handleBakeLogoToWebM} disabled={isEncoding}
                  className="w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-md font-medium transition-all bg-violet-700 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  🎬 {isEncoding ? `Encoding… ${Math.round(encodingProgress * 100)}%` : "Bake Logo to WebM (Animated)"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div className="text-muted-foreground/40 space-y-2">
              <ImageIcon size={28} className="mx-auto" />
              <p className="text-[10px]">Upload a logo PNG to place it on the controller</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
