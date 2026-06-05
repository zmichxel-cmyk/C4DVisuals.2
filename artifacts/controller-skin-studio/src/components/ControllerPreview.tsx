import { useRef } from "react";
import { useGamepad } from "../hooks/useGamepad";
import { hexToRgba } from "../lib/controllerLayout";
import { LAYOUTS } from "../lib/layouts";
import { ControllerConfig, LayoutOverrides } from "../types/config";
import { LayoutEditor } from "./LayoutEditor";

interface Props {
  config: ControllerConfig;
  overrides: LayoutOverrides;
  showButtonLabels: boolean;
  editMode?: boolean;
  onOverridesChange?: (o: LayoutOverrides) => void;
}

export function ControllerPreview({ config, overrides, showButtonLabels, editMode, onOverridesChange }: Props) {
  const gp = useGamepad();
  const containerRef = useRef<HTMLDivElement>(null);

  const baseLayout = LAYOUTS[config.controllerType] ?? LAYOUTS["xbox-one"];

  const buttons = baseLayout.buttons.map((b) => ({
    ...b,
    ...(overrides.buttons[b.index] ?? {}),
  }));
  const sticks = baseLayout.sticks.map((s, i) => ({
    ...s,
    ...(overrides.sticks[i] ?? {}),
  }));

  const lStick = sticks[0];
  const rStick = sticks[1];
  const lx = gp.axes[lStick.axisX] ?? 0;
  const ly = gp.axes[lStick.axisY] ?? 0;
  const rx = gp.axes[rStick.axisX] ?? 0;
  const ry = gp.axes[rStick.axisY] ?? 0;

  const ltLabel = config.controllerType === "xbox-one" ? "LT" : "L2";
  const rtLabel = config.controllerType === "xbox-one" ? "RT" : "R2";

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ aspectRatio: `${config.width}/${config.height}` }}
    >
      {/* Controller background */}
      <div
        className="absolute inset-0"
        style={{
          background: config.controllerSkin
            ? `url("${config.controllerSkin}") center/contain no-repeat`
            : undefined,
        }}
      >
        {!config.controllerSkin && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-5xl mb-2 opacity-20">🎮</div>
              <p className="text-sm opacity-50">Upload a controller skin</p>
            </div>
          </div>
        )}
      </div>

      {/* Button overlays — one full-size masked div per button */}
      {!editMode && buttons.map((btn) => {
        const isLt = btn.index === 6;
        const isRt = btn.index === 7;
        const isTrigger = isLt || isRt;
        const pressed = gp.buttons[btn.index] ?? false;

        let activeOpacity = 0;
        if (isTrigger) {
          const tv = isLt ? (gp.triggers[0] ?? 0) : (gp.triggers[1] ?? 0);
          activeOpacity = tv * config.buttonOpacity;
        } else {
          activeOpacity = pressed ? config.buttonOpacity : 0;
        }

        const effectiveColor = config.usePerButtonColors
          ? (baseLayout.buttonColors[btn.index] ?? config.buttonColor)
          : config.buttonColor;

        const maskDef = baseLayout.buttonMasks[btn.index];

        // Gradient background (inner fade uses button center from mask metadata)
        const gradCx = maskDef ? maskDef.cx : 50;
        const gradCy = maskDef ? maskDef.cy : 50;
        const bg = config.innerFade
          ? `radial-gradient(circle at ${gradCx}% ${gradCy}%, ${effectiveColor} 0%, ${hexToRgba(effectiveColor, 0.5)} 45%, transparent 100%)`
          : effectiveColor;

        // Glow via drop-shadow (follows mask contour unlike box-shadow)
        const glowFilter = (config.glowEnabled && activeOpacity > 0.01)
          ? `drop-shadow(0 0 ${config.glowSize}px ${hexToRgba(effectiveColor, 0.9)}) drop-shadow(0 0 ${config.glowSize * 2}px ${hexToRgba(effectiveColor, 0.45)})`
          : "none";

        const transitionProp = isTrigger
          ? "opacity 0.06s linear, filter 0.06s linear"
          : "opacity 0.04s, filter 0.04s";

        if (maskDef) {
          // ── Exact-shape overlay using template mask ──────────────────────────
          return (
            <div
              key={btn.index}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: bg,
                WebkitMaskImage: `url(${maskDef.url})`,
                maskImage: `url(${maskDef.url})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                opacity: activeOpacity,
                filter: glowFilter,
                transition: transitionProp,
              }}
            />
          );
        }

        // ── Geometric fallback (no mask defined) ─────────────────────────────
        const hPct = btn.shape === "pill-h" || btn.shape === "rect" ? btn.size * 0.45 : btn.size;
        const borderRadius =
          btn.shape === "circle" || btn.shape.startsWith("cross")
            ? "50%"
            : btn.shape === "rect"
            ? "8px"
            : "9999px";

        return (
          <div
            key={btn.index}
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: `${btn.x}%`,
              top: `${btn.y}%`,
              width: `${btn.size}%`,
              height: `${hPct}%`,
              borderRadius,
              transform: "translate(-50%, -50%)",
              background: bg,
              opacity: activeOpacity,
              filter: glowFilter,
              transition: transitionProp,
            }}
          >
            {showButtonLabels && (
              <span className="font-bold select-none" style={{ fontSize: "clamp(5px,1%,9px)", color: "#000", mixBlendMode: "multiply" }}>
                {btn.label}
              </span>
            )}
          </div>
        );
      })}

      {/* Left stick */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${lStick.x}%`, top: `${lStick.y}%`,
          width: `${lStick.size}%`, aspectRatio: "1/1",
          transform: "translate(-50%,-50%)",
        }}
      >
        <div
          style={{
            width: "100%", height: "100%",
            transform: editMode ? undefined : `translate(${lx * config.stickTravel}px, ${ly * config.stickTravel}px)`,
            transition: "transform 0.03s",
          }}
        >
          {config.leftStickSkin
            ? <img src={config.leftStickSkin} alt="LS" className="w-full h-full object-contain" />
            : <div className="w-full h-full rounded-full bg-white/10 border border-white/20" />
          }
        </div>
      </div>

      {/* Right stick */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${rStick.x}%`, top: `${rStick.y}%`,
          width: `${rStick.size}%`, aspectRatio: "1/1",
          transform: "translate(-50%,-50%)",
        }}
      >
        <div
          style={{
            width: "100%", height: "100%",
            transform: editMode ? undefined : `translate(${rx * config.stickTravel}px, ${ry * config.stickTravel}px)`,
            transition: "transform 0.03s",
          }}
        >
          {config.rightStickSkin
            ? <img src={config.rightStickSkin} alt="RS" className="w-full h-full object-contain" />
            : <div className="w-full h-full rounded-full bg-white/10 border border-white/20" />
          }
        </div>
      </div>

      {/* Trigger pressure bars */}
      {!editMode && (
        <>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5" style={{ opacity: gp.connected ? 1 : 0.2 }}>
            <span className="text-[9px] text-white/50 font-mono w-5">{ltLabel}</span>
            <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full transition-all duration-[60ms]"
                style={{ width: `${(gp.triggers[0] ?? 0) * 100}%` }} />
            </div>
            <span className="text-[9px] text-white/40 font-mono w-5 text-right">
              {Math.round((gp.triggers[0] ?? 0) * 100)}
            </span>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5" style={{ opacity: gp.connected ? 1 : 0.2 }}>
            <span className="text-[9px] text-white/40 font-mono w-5">
              {Math.round((gp.triggers[1] ?? 0) * 100)}
            </span>
            <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full transition-all duration-[60ms]"
                style={{ width: `${(gp.triggers[1] ?? 0) * 100}%` }} />
            </div>
            <span className="text-[9px] text-white/50 font-mono w-5">{rtLabel}</span>
          </div>
        </>
      )}

      {/* Layout editor overlay */}
      {editMode && onOverridesChange && (
        <LayoutEditor
          layout={baseLayout}
          overrides={overrides}
          onOverridesChange={onOverridesChange}
          containerRef={containerRef}
        />
      )}

      {/* Connection status badge */}
      {!editMode && (
        <div
          className={`absolute top-2 right-2 text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all ${
            gp.connected
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-black/40 text-white/25 border-white/10"
          }`}
        >
          {gp.connected ? "● Connected" : `○ ${baseLayout.connectMessage}`}
        </div>
      )}
    </div>
  );
}
