import { useRef, useState, useCallback } from "react";
import { XBOX_LAYOUT, BUTTON_COLORS, STICK_COLORS } from "../lib/controllerLayout";
import { LayoutOverrides, ButtonOverride, StickOverride } from "../types/config";
import { RotateCcw } from "lucide-react";

interface Props {
  overrides: LayoutOverrides;
  onOverridesChange: (o: LayoutOverrides) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface DragState {
  pointerId: number;
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

interface MarkerProps {
  label: string;
  x: number;
  y: number;
  size: number;
  heightPct: number;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (size: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function DraggableMarker({
  label, x, y, size, heightPct, color, isSelected,
  onSelect, onMove, onResize, containerRef,
}: MarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = useCallback((e: React.PointerEvent, isResize: boolean) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container || !markerRef.current) return;
    const rect = container.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
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
      const delta = (dx / d.containerW) * 100 * 2;
      const newSize = clamp(d.startSize + delta, 1.5, 25);
      onResize(newSize);
    } else {
      onMove(
        clamp(d.startX + (dx / d.containerW) * 100, 0, 100),
        clamp(d.startY + (dy / d.containerH) * 100, 0, 100),
      );
    }
  }, [onMove, onResize]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const isPill = heightPct !== size;
  const displayH = isPill ? heightPct : size;

  return (
    <div
      ref={markerRef}
      className="absolute touch-none select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        height: `${displayH}%`,
        transform: "translate(-50%, -50%)",
        cursor: "move",
        zIndex: isSelected ? 30 : 10,
      }}
      onPointerDown={(e) => startDrag(e, false)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Marker body */}
      <div
        className="w-full h-full rounded-full flex items-center justify-center relative"
        style={{
          background: `${color}55`,
          border: `2px solid ${color}`,
          boxShadow: isSelected ? `0 0 0 2px white, 0 0 12px ${color}99` : `0 0 6px ${color}66`,
        }}
      >
        <span
          className="font-bold pointer-events-none leading-none"
          style={{
            fontSize: "clamp(5px, 1.1%, 10px)",
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {label}
        </span>

        {/* Resize handle — bottom right corner */}
        <div
          className="absolute bottom-0 right-0 rounded-sm"
          style={{
            width: "clamp(6px, 0.8%, 12px)",
            height: "clamp(6px, 0.8%, 12px)",
            background: color,
            cursor: "se-resize",
            opacity: isSelected ? 1 : 0.5,
          }}
          onPointerDown={(e) => { e.stopPropagation(); startDrag(e, true); }}
        />
      </div>

      {/* Tooltip showing position */}
      {isSelected && (
        <div
          className="absolute -top-5 left-1/2 text-[9px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none"
          style={{ transform: "translateX(-50%)" }}
        >
          {x.toFixed(1)}, {y.toFixed(1)} · {size.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export function LayoutEditor({ overrides, onOverridesChange, containerRef }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function getBtn(idx: number) {
    const base = XBOX_LAYOUT.buttons[idx];
    return { ...base, ...(overrides.buttons[base.index] ?? {}) };
  }

  function getStick(i: number) {
    const base = XBOX_LAYOUT.sticks[i];
    return { ...base, ...(overrides.sticks[i] ?? {}) };
  }

  function updateButton(idx: number, updates: Partial<ButtonOverride>) {
    onOverridesChange({
      ...overrides,
      buttons: {
        ...overrides.buttons,
        [idx]: { ...(overrides.buttons[idx] ?? {}), ...updates },
      },
    });
  }

  function updateStick(i: number, updates: Partial<StickOverride>) {
    onOverridesChange({
      ...overrides,
      sticks: {
        ...overrides.sticks,
        [i]: { ...(overrides.sticks[i] ?? {}), ...updates },
      },
    });
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    onOverridesChange({ buttons: {}, sticks: {} });
    setSelected(null);
  }

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 20 }}
      onClick={() => setSelected(null)}
    >
      {/* Dimmed overlay hint */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Edit mode label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full pointer-events-none backdrop-blur-sm">
        Edit Layout — drag markers to reposition, corner to resize
      </div>

      {/* Reset button */}
      <button
        className="absolute top-2 left-2 flex items-center gap-1 text-[10px] bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded-md border border-white/20 transition-colors"
        onClick={handleReset}
      >
        <RotateCcw size={10} />
        Reset
      </button>

      {/* Button markers */}
      {XBOX_LAYOUT.buttons.map((btn) => {
        const eff = getBtn(btn.index);
        const isPill = btn.shape === "pill-h" || btn.shape === "pill-v";
        const heightPct = isPill ? eff.size * 0.45 : eff.size;
        const key = `btn-${btn.index}`;
        return (
          <DraggableMarker
            key={key}
            label={btn.label}
            x={eff.x}
            y={eff.y}
            size={eff.size}
            heightPct={heightPct}
            color={BUTTON_COLORS[btn.index] ?? "#fff"}
            isSelected={selected === key}
            onSelect={() => setSelected(key)}
            onMove={(x, y) => updateButton(btn.index, { x, y })}
            onResize={(size) => updateButton(btn.index, { size })}
            containerRef={containerRef}
          />
        );
      })}

      {/* Stick position markers */}
      {XBOX_LAYOUT.sticks.map((stick, i) => {
        const eff = getStick(i);
        const key = `stick-${i}`;
        return (
          <DraggableMarker
            key={key}
            label={`${stick.label} pos`}
            x={eff.x}
            y={eff.y}
            size={eff.size}
            heightPct={eff.size}
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
