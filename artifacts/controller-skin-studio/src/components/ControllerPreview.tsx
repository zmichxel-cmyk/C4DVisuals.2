import { useRef } from "react";
import { useGamepad } from "../hooks/useGamepad";
import { XBOX_LAYOUT } from "../lib/controllerLayout";
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

  const layout = XBOX_LAYOUT;

  // Merge overrides into layout
  const buttons = layout.buttons.map((b) => ({
    ...b,
    ...(overrides.buttons[b.index] ?? {}),
  }));
  const sticks = layout.sticks.map((s, i) => ({
    ...s,
    ...(overrides.sticks[i] ?? {}),
  }));

  const lStick = sticks[0];
  const rStick = sticks[1];

  const lx = gp.axes[lStick.axisX] ?? 0;
  const ly = gp.axes[lStick.axisY] ?? 0;
  const rx = gp.axes[rStick.axisX] ?? 0;
  const ry = gp.axes[rStick.axisY] ?? 0;

  const travel = config.stickTravel;

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
              <p className="text-sm opacity-50">Upload a controller skin to preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Button overlays (hidden in edit mode so editor markers are visible) */}
      {!editMode && buttons.map((btn) => {
        const pressed = gp.buttons[btn.index] ?? false;
        const isLt = btn.index === 6;
        const isRt = btn.index === 7;
        const triggerVal = isLt ? (gp.triggers[0] ?? 0) : isRt ? (gp.triggers[1] ?? 0) : 0;
        const isTrigger = isLt || isRt;
        const active = pressed || (isTrigger && triggerVal > 0.1);

        const isH = btn.shape === "pill-h";
        const heightPct = isH ? btn.size * 0.45 : btn.size;
        const borderRadius =
          btn.shape === "circle" || btn.shape.startsWith("cross") ? "50%" : "9999px";

        return (
          <div
            key={btn.index}
            className="absolute pointer-events-none flex items-center justify-center transition-opacity duration-[40ms]"
            style={{
              left: `${btn.x}%`,
              top: `${btn.y}%`,
              width: `${btn.size}%`,
              height: `${heightPct}%`,
              borderRadius,
              transform: "translate(-50%, -50%)",
              background: config.buttonColor,
              opacity: active ? config.buttonOpacity : 0,
            }}
          >
            {showButtonLabels && (
              <span
                className="text-[0.4rem] font-bold select-none"
                style={{ color: "#000", mixBlendMode: "multiply" }}
              >
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
          left: `${lStick.x}%`,
          top: `${lStick.y}%`,
          width: `${lStick.size}%`,
          height: `${lStick.size}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: editMode ? undefined : `translate(${lx * travel}px, ${ly * travel}px)`,
          }}
        >
          {config.leftStickSkin ? (
            <img src={config.leftStickSkin} alt="Left stick" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full rounded-full bg-white/10 border border-white/20" />
          )}
        </div>
      </div>

      {/* Right stick */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${rStick.x}%`,
          top: `${rStick.y}%`,
          width: `${rStick.size}%`,
          height: `${rStick.size}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: editMode ? undefined : `translate(${rx * travel}px, ${ry * travel}px)`,
          }}
        >
          {config.rightStickSkin ? (
            <img src={config.rightStickSkin} alt="Right stick" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full rounded-full bg-white/10 border border-white/20" />
          )}
        </div>
      </div>

      {/* Layout Editor overlay */}
      {editMode && onOverridesChange && (
        <LayoutEditor
          overrides={overrides}
          onOverridesChange={onOverridesChange}
          containerRef={containerRef}
        />
      )}

      {/* Gamepad status badge (hidden in edit mode) */}
      {!editMode && (
        <div
          className={`absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded-full transition-opacity duration-500 ${
            gp.connected
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-100"
              : "bg-white/5 text-white/30 border border-white/10 opacity-60"
          }`}
        >
          {gp.connected ? `Connected: ${gp.id.slice(0, 30)}` : "No gamepad detected — press a button"}
        </div>
      )}
    </div>
  );
}
