import { useRef } from "react";
import { useGamepad } from "../hooks/useGamepad";
import { buttonHeightPct, buttonBorderRadius } from "../lib/controllerLayout";
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

  // Merge overrides into layout
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

      {/* Button overlays */}
      {!editMode && buttons.map((btn) => {
        const pressed = gp.buttons[btn.index] ?? false;
        const isLt = btn.index === 6;
        const isRt = btn.index === 7;
        const isTrigger = isLt || isRt;

        // Analog trigger: use actual trigger value (0–1) for opacity
        let activeOpacity = 0;
        if (isTrigger) {
          const triggerVal = isLt ? (gp.triggers[0] ?? 0) : (gp.triggers[1] ?? 0);
          activeOpacity = triggerVal * config.buttonOpacity;
        } else {
          activeOpacity = pressed ? config.buttonOpacity : 0;
        }

        const hPct = buttonHeightPct(btn);
        const radius = buttonBorderRadius(btn.shape);

        return (
          <div
            key={btn.index}
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: `${btn.x}%`,
              top: `${btn.y}%`,
              width: `${btn.size}%`,
              height: `${hPct}%`,
              borderRadius: radius,
              transform: "translate(-50%, -50%)",
              background: config.buttonColor,
              opacity: activeOpacity,
              transition: isTrigger ? "opacity 0.06s linear" : "opacity 0.04s",
            }}
          >
            {showButtonLabels && (
              <span
                className="font-bold select-none"
                style={{
                  fontSize: "clamp(5px, 1%, 9px)",
                  color: "#000",
                  mixBlendMode: "multiply",
                }}
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
          aspectRatio: "1/1",
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
          aspectRatio: "1/1",
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

      {/* Trigger fill bars (analog visualization, only in preview mode) */}
      {!editMode && (
        <>
          {/* LT bar */}
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1"
            style={{ opacity: gp.connected ? 1 : 0.25 }}
          >
            <span className="text-[9px] text-white/50 font-mono w-5">
              {config.controllerType === "xbox-one" ? "LT" : "L2"}
            </span>
            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-[60ms]"
                style={{ width: `${(gp.triggers[0] ?? 0) * 100}%` }}
              />
            </div>
          </div>
          {/* RT bar */}
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1"
            style={{ opacity: gp.connected ? 1 : 0.25 }}
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-[60ms]"
                style={{ width: `${(gp.triggers[1] ?? 0) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-white/50 font-mono w-5">
              {config.controllerType === "xbox-one" ? "RT" : "R2"}
            </span>
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

      {/* Gamepad status badge */}
      {!editMode && (
        <div
          className={`absolute top-2 right-2 text-[9px] font-mono px-2 py-0.5 rounded-full transition-all ${
            gp.connected
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/5 text-white/20 border border-white/10"
          }`}
        >
          {gp.connected ? "● Connected" : "○ No gamepad"}
        </div>
      )}
    </div>
  );
}
