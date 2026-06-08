import { useRef, useState, useCallback, useEffect } from "react";
import { ControllerLayout, buttonHeightPct, STICK_COLORS } from "../lib/controllerLayout";
import { LayoutOverrides, ButtonOverride, StickOverride } from "../types/config";
import { RotateCcw } from "lucide-react";

interface Props {
  layout: ControllerLayout;
  overrides: LayoutOverrides;
  onOverridesChange: (o: LayoutOverrides) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface MaskStyle {
  WebkitMaskImage: string;
  maskImage: string;
  WebkitMaskSize: string;
  maskSize: string;
  WebkitMaskPosition: string;
  maskPosition: string;
  WebkitMaskRepeat: string;
  maskRepeat: string;
}

interface DragState {
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startSize: number;
  containerW: number;
  containerH: number;
  isResize: boolean;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function computeMaskStyle(
  btn: { x: number; y: number; size: number; index: number },
  hPct: number,
  maskDef: { url: string; cx: number; cy: number } | undefined,
  layout: ControllerLayout,
  containerW: number,
  containerH: number
): MaskStyle | undefined {
  if (!maskDef || containerW === 0 || containerH === 0) return undefined;
  
  const scale = Math.min(containerW / layout.skinWidth, containerH / layout.skinHeight);
  const renderedImgW = layout.skinWidth * scale;
  const renderedImgH = layout.skinHeight * scale;
  
  // Compute pixel offset so the mask's button shape centre aligns with the element centre.
  // This mirrors the same math used in ControllerPreview's maskStyle().
  const elW = (btn.size / 100) * containerW;
  const elH = (hPct   / 100) * containerH;
  const mpX = elW / 2 - (maskDef.cx / 100) * renderedImgW;
  const mpY = elH / 2 - (maskDef.cy / 100) * renderedImgH;

  return {
    WebkitMaskImage: `url(${maskDef.url})`,
    maskImage: `url(${maskDef.url})`,
    WebkitMaskSize: `${renderedImgW}px ${renderedImgH}px`,
    maskSize: `${renderedImgW}px ${renderedImgH}px`,
    WebkitMaskPosition: `${mpX}px ${mpY}px`,
    maskPosition: `${mpX}px ${mpY}px`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };
}

interface MarkerProps {
  label: string;
  x: number;
  y: number;
  size: number;
  heightPct: number;
  borderRadius: string;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (size: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  maskStyle?: MaskStyle;
}

function DraggableMarker({
  label, x, y, size, heightPct, borderRadius, color, isSelected,
  onSelect, onMove, onResize, containerRef, maskStyle,
}: MarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = useCallback((e: React.PointerEvent, isResize: boolean) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container || !markerRef.current) return;
    const rect = container.getBoundingClientRect();
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: x,
      startY: y,
      startSize: size,
      containerW: rect.width,
      containerH: rect.height,
      isResize,
    };
    markerRef.current.setPointerCapture(e.pointerId);
    onSelect();
  }, [x, y, size, containerRef, onSelect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (d.isResize) {
      const newSize = clamp(d.startSize + (dx / d.containerW) * 100 * 2, 1.5, 30);
      onResize(newSize);
    } else {
      onMove(
        clamp(d.startX + (dx / d.containerW) * 100, 0, 100),
        clamp(d.startY + (dy / d.containerH) * 100, 0, 100),
      );
    }
  }, [onMove, onResize]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  return (
    <div
      ref={markerRef}
      className="absolute touch-none select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        height: `${heightPct}%`,
        transform: "translate(-50%, -50%)",
        cursor: "move",
        zIndex: isSelected ? 30 : 10,
      }}
      onPointerDown={(e) => startDrag(e, false)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="w-full h-full flex items-center justify-center relative"
        style={{
          borderRadius: maskStyle ? "0" : borderRadius,
          background: maskStyle ? color : `${color}55`,
          border: maskStyle ? "none" : `3px solid ${color}`,
          boxShadow: isSelected
            ? `0 0 0 2px white, 0 0 12px ${color}99`
            : `0 0 6px ${color}55`,
          opacity: 1,
          backgroundColor: color,
          ...maskStyle,
        }}
      >
        <span
          className="font-bold pointer-events-none leading-none"
          style={{ fontSize: "clamp(5px, 1.1%, 10px)", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
        >
          {label}
        </span>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 rounded-sm"
          style={{
            width: "clamp(6px, 0.9%, 12px)",
            height: "clamp(6px, 0.9%, 12px)",
            background: color,
            cursor: "se-resize",
            opacity: isSelected ? 1 : 0.4,
          }}
          onPointerDown={(e) => { e.stopPropagation(); startDrag(e, true); }}
        />
      </div>

      {/* Coordinate tooltip */}
      {isSelected && (
        <div
          className="absolute -top-6 left-1/2 text-[9px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none"
          style={{ transform: "translateX(-50%)" }}
        >
          {x.toFixed(1)}, {y.toFixed(1)} · {size.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export function LayoutEditor({ layout, overrides, onOverridesChange, containerRef }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  function getBtn(idx: number) {
    const base = layout.buttons.find((b) => b.index === idx)!;
    return { ...base, ...(overrides.buttons[idx] ?? {}) };
  }

  function getStick(i: number) {
    const base = layout.sticks[i];
    return { ...base, ...(overrides.sticks[i] ?? {}) };
  }

  function updateButton(idx: number, updates: Partial<ButtonOverride>) {
    onOverridesChange({
      ...overrides,
      buttons: { ...overrides.buttons, [idx]: { ...(overrides.buttons[idx] ?? {}), ...updates } },
    });
  }

  function updateStick(i: number, updates: Partial<StickOverride>) {
    onOverridesChange({
      ...overrides,
      sticks: { ...overrides.sticks, [i]: { ...(overrides.sticks[i] ?? {}), ...updates } },
    });
  }

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 20 }}
      onClick={() => setSelected(null)}
    >
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Mode label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full pointer-events-none">
        Drag markers to reposition · corner handle to resize
      </div>

      {/* Reset button */}
      <button
        className="absolute top-2 left-2 flex items-center gap-1 text-[10px] bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded-md border border-white/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); onOverridesChange({ buttons: {}, sticks: {} }); setSelected(null); }}
      >
        <RotateCcw size={10} /> Reset
      </button>

      {/* Button markers */}
      {layout.buttons.map((btn) => {
        const eff = getBtn(btn.index);
        const hPct = buttonHeightPct(eff);
        const key = `btn-${btn.index}`;
        const radius = eff.shape === "rect" ? "8px" : eff.shape === "circle" || eff.shape.startsWith("cross") ? "50%" : "9999px";
        const maskDef = layout.buttonMasks[btn.index];
        
        // For mask buttons, position marker at mask center for perfect alignment
        const posX = maskDef ? maskDef.cx : eff.x;
        const posY = maskDef ? maskDef.cy : eff.y;
        
        const maskStyle = computeMaskStyle(
          { ...eff, x: posX, y: posY }, 
          hPct, 
          maskDef, 
          layout, 
          containerSize.w, 
          containerSize.h
        );
        
        return (
          <DraggableMarker
            key={key}
            label={btn.label}
            x={posX}
            y={posY}
            size={eff.size}
            heightPct={hPct}
            borderRadius={radius}
            color={layout.buttonColors[btn.index] ?? "#fff"}
            isSelected={selected === key}
            onSelect={() => setSelected(key)}
            onMove={(x, y) => updateButton(btn.index, { x, y })}
            onResize={(size) => updateButton(btn.index, { size })}
            containerRef={containerRef}
            maskStyle={maskStyle}
          />
        );
      })}

      {/* Stick markers */}
      {layout.sticks.map((stick, i) => {
        const eff = getStick(i);
        const key = `stick-${i}`;
        return (
          <DraggableMarker
            key={key}
            label={`${stick.label} zone`}
            x={eff.x}
            y={eff.y}
            size={eff.size}
            heightPct={eff.size}
            borderRadius="50%"
            color={STICK_COLORS[i] ?? "#fff"}
            isSelected={selected === key}
            onSelect={() => setSelected(key)}
            onMove={(x, y) => updateStick(i, { x, y })}
            onResize={(size) => updateStick(i, { size })}
            containerRef={containerRef}
          />
        );
      })}
    </div>
  );
}
