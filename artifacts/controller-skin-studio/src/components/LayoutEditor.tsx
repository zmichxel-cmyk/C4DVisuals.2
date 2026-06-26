import { useRef, useState, useEffect } from "react";
import { ControllerLayout, STICK_COLORS } from "../lib/controllerLayout";
import { LayoutOverrides, ButtonOverride, StickOverride } from "../types/config";
import { RotateCcw, GripHorizontal } from "lucide-react";

interface Props {
  layout: ControllerLayout;
  overrides: LayoutOverrides;
  onOverridesChange: (o: LayoutOverrides) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerW: number;
  containerH: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface MarkerProps {
  label: string;
  x: number; y: number;
  w: number; h: number; // % of container
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (newW: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  maskUrl?: string; // cropped mask PNG — fill element exactly
  borderRadius?: string;
}

function DraggableMarker({
  label, x, y, w, h, color, isSelected,
  onSelect, onMove, onResize, containerRef,
  maskUrl, borderRadius = "50%",
}: MarkerProps) {
  const dragRef = useRef<{
    active: boolean; isResize: boolean;
    startClientX: number; startClientY: number;
    startX: number; startY: number; startW: number;
    cW: number; cH: number;
  } | null>(null);

  const cbRef = useRef({ onMove, onResize, onSelect });
  useEffect(() => { cbRef.current = { onMove, onResize, onSelect }; }, [onMove, onResize, onSelect]);

  useEffect(() => {
    const onMM = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d?.active) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      if (d.isResize) {
        const delta = (dx + dy) / 2;
        const newW = clamp(d.startW + (delta / d.cW) * 100, 0.5, 60);
        cbRef.current.onResize(newW);
      } else {
        cbRef.current.onMove(
          clamp(d.startX + (dx / d.cW) * 100, 0, 100),
          clamp(d.startY + (dy / d.cH) * 100, 0, 100),
        );
      }
    };
    const onMU = () => { if (dragRef.current) dragRef.current.active = false; };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, []);

  const beginDrag = (e: React.MouseEvent, isResize: boolean) => {
    e.stopPropagation(); e.preventDefault();
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    dragRef.current = {
      active: true, isResize,
      startClientX: e.clientX, startClientY: e.clientY,
      startX: x, startY: y, startW: w,
      cW: r.width, cH: r.height,
    };
    cbRef.current.onSelect();
  };

  // Cropped mask PNG fills the element exactly — scales perfectly like thumbsticks
  const maskStyle: React.CSSProperties = maskUrl ? {
    WebkitMaskImage: `url(${maskUrl})`,
    maskImage: `url(${maskUrl})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  } : {};

  const glow = isSelected
    ? `drop-shadow(0 0 3px white) drop-shadow(0 0 6px white) drop-shadow(0 0 10px ${color})`
    : `drop-shadow(0 0 4px ${color}cc)`;

  return (
    <>
      <div
        className="absolute touch-none select-none"
        style={{
          left: `${x}%`, top: `${y}%`,
          width: `${w}%`, height: `${h}%`,
          transform: "translate(-50%, -50%)",
          cursor: "move", zIndex: isSelected ? 30 : 10,
        }}
        onMouseDown={(e) => beginDrag(e, false)}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          borderRadius: maskUrl ? "0" : borderRadius,
          backgroundColor: color,
          opacity: isSelected ? 1 : 0.85,
          filter: glow,
          ...maskStyle,
        }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
          <span style={{ fontSize: "clamp(5px,1.1%,11px)", fontWeight: "bold", color: "#fff", textShadow: "0 1px 3px #000", lineHeight: 1 }}>
            {label}
          </span>
        </div>
        {isSelected && (
          <div style={{
            position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)",
            fontSize: "9px", fontFamily: "monospace", background: "rgba(0,0,0,0.85)",
            color: "white", padding: "1px 5px", borderRadius: "4px",
            whiteSpace: "nowrap", pointerEvents: "none", zIndex: 50,
          }}>
            {x.toFixed(1)}, {y.toFixed(1)} · {w.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Resize grip — always visible, sibling so never clipped */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: `${x}%`, top: `calc(${y}% + ${h / 2}%)`,
          transform: "translate(-50%, 4px)",
          width: "28px", height: "16px",
          background: isSelected ? color : `${color}99`,
          borderRadius: "999px", cursor: "se-resize", zIndex: 50,
          boxShadow: isSelected
            ? "0 1px 6px rgba(0,0,0,0.7), 0 0 0 2px white"
            : "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.4)",
        }}
        onMouseDown={(e) => beginDrag(e, true)}
      >
        <GripHorizontal size={10} color="white" strokeWidth={2.5} style={{ pointerEvents: "none" }} />
      </div>
    </>
  );
}

export function LayoutEditor({ layout, overrides, onOverridesChange, containerRef, containerW, containerH }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // Use container size passed from ControllerPreview (already observed there)
  const cs = { w: containerW, h: containerH };
  const scale = cs.w > 0 && cs.h > 0 ? Math.min(cs.w / layout.skinWidth, cs.h / layout.skinHeight) : 0;
  const rendW = layout.skinWidth * scale;
  const rendH = layout.skinHeight * scale;

  function getBtn(idx: number) {
    const base = layout.buttons.find((b) => b.index === idx)!;
    return { ...base, ...(overrides.buttons[idx] ?? {}) };
  }
  function getStick(i: number) { return { ...layout.sticks[i], ...(overrides.sticks[i] ?? {}) }; }
  function updateButton(idx: number, u: Partial<ButtonOverride>) {
    onOverridesChange({ ...overrides, buttons: { ...overrides.buttons, [idx]: { ...(overrides.buttons[idx] ?? {}), ...u } } });
  }
  function updateStick(i: number, u: Partial<StickOverride>) {
    onOverridesChange({ ...overrides, sticks: { ...overrides.sticks, [i]: { ...(overrides.sticks[i] ?? {}), ...u } } });
  }

  return (
    <div className="absolute inset-0" style={{ zIndex: 20 }} onClick={() => setSelected(null)}>
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full pointer-events-none">
        Drag to move · grip pill to resize
      </div>
      <button
        className="absolute top-2 left-2 flex items-center gap-1 text-[10px] bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded-md border border-white/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); onOverridesChange({ buttons: {}, sticks: {} }); setSelected(null); }}
      >
        <RotateCcw size={10} /> Reset
      </button>

      {scale > 0 && layout.buttons.map((btn) => {
        const eff = getBtn(btn.index);
        const maskDef = layout.buttonMasks[btn.index];
        const key = `btn-${btn.index}`;

        const hasPos = overrides.buttons[btn.index]?.x !== undefined;
        const posX = hasPos ? eff.x : (maskDef ? maskDef.cx : btn.x);
        const posY = hasPos ? eff.y : (maskDef ? maskDef.cy : btn.y);

        // Natural size = shape bounds as % of container (using renderedImgW/H)
        const natW = (maskDef && cs.w > 0) ? (maskDef.sw / 100) * rendW / cs.w * 100 : btn.size;
        const natH = (maskDef && cs.h > 0) ? (maskDef.sh / 100) * rendH / cs.h * 100
          : (btn.shape === "pill-h" || btn.shape === "rect" ? btn.size * 0.45 : btn.size);

        const hasSz = overrides.buttons[btn.index]?.size !== undefined;
        const curW = hasSz ? eff.size : natW;
        const curH = hasSz ? natH * (eff.size / natW) : natH;

        const radius = btn.shape === "rect" ? "8px"
          : btn.shape === "circle" || btn.shape.startsWith("cross") ? "50%" : "9999px";

        // Use cropped mask URL for editor (masks-cropped/) — fills element at 100% 100%
        const croppedUrl = maskDef?.url.replace("masks/", "masks-cropped/");

        return (
          <DraggableMarker key={key} label={btn.label}
            x={posX} y={posY} w={curW} h={curH}
            color={layout.buttonColors[btn.index] ?? "#fff"}
            isSelected={selected === key}
            onSelect={() => setSelected(key)}
            onMove={(nx, ny) => updateButton(btn.index, { x: nx, y: ny })}
            onResize={(nw) => updateButton(btn.index, { size: nw })}
            containerRef={containerRef}
            maskUrl={croppedUrl}
            borderRadius={radius}
          />
        );
      })}

      {layout.sticks.map((stick, i) => {
        const eff = getStick(i);
        const key = `stick-${i}`;
        const curW = overrides.sticks[i]?.size !== undefined ? eff.size : stick.size;
        return (
          <DraggableMarker key={key} label={`${stick.label} zone`}
            x={eff.x} y={eff.y} w={curW} h={cs.w > 0 && cs.h > 0 ? curW * (cs.w / cs.h) : curW}
            color={layout.buttonColors[stick.pressBtn] ?? STICK_COLORS[i] ?? "#fff"}
            isSelected={selected === key}
            onSelect={() => setSelected(key)}
            onMove={(nx, ny) => updateStick(i, { x: nx, y: ny })}
            onResize={(nw) => updateStick(i, { size: nw })}
            containerRef={containerRef}
            borderRadius="50%"
          />
        );
      })}
    </div>
  );
}
