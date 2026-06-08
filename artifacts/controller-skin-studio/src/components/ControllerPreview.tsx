import { useRef, useState, useEffect } from "react";
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

  // Track the container's rendered CSS size so we can compute mask scaling
  const [cssSize, setCssSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCssSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Compute how the controller skin renders inside the container (background-size: contain)
  const { skinWidth, skinHeight } = baseLayout;
  const { w: cW, h: cH } = cssSize;
  const scale = cW > 0 && cH > 0 ? Math.min(cW / skinWidth, cH / skinHeight) : 0;
  const renderedImgW = skinWidth * scale;   // mask image rendered width in CSS px
  const renderedImgH = skinHeight * scale;  // mask image rendered height in CSS px

  // For each mask button we position the wrapper div at btn.x%, btn.y%
  // and compute mask-position so the button shape from the template is
  // always centred inside the wrapper — regardless of where the wrapper is dragged.
  function maskStyle(btn: typeof buttons[number], hPct: number, maskUrl: string, maskCx: number, maskCy: number) {
    if (scale === 0) return {};   // wait for first ResizeObserver tick
    const elW = (btn.size / 100) * cW;   // element width in CSS px
    const elH = (hPct   / 100) * cH;    // element height in CSS px
    // Offset the mask image so the button's shape centre aligns with the element centre
    const mpX = elW / 2 - (maskCx / 100) * renderedImgW;
    const mpY = elH / 2 - (maskCy / 100) * renderedImgH;
    return {
      WebkitMaskImage: `url(${maskUrl})`,
      maskImage: `url(${maskUrl})`,
      WebkitMaskSize: `${renderedImgW}px ${renderedImgH}px`,
      maskSize: `${renderedImgW}px ${renderedImgH}px`,
      WebkitMaskPosition: `${mpX}px ${mpY}px`,
      maskPosition: `${mpX}px ${mpY}px`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
    };
  }

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

      {/* Button overlays - DEBUG: always visible in edit mode */}
      {buttons.map((btn) => {
        const isLt = btn.index === 6;
        const isRt = btn.index === 7;
        const isTrigger = isLt || isRt;
        const pressed = gp.buttons[btn.index] ?? false;
        const maskDef = baseLayout.buttonMasks[btn.index];

        // Opacity: live only in preview, faint guide in edit mode
        let activeOpacity = 0;
        if (editMode) {
          activeOpacity = 0; // completely hide in edit mode - LayoutEditor handles markers
        } else if (isTrigger) {
          const tv = isLt ? (gp.triggers[0] ?? 0) : (gp.triggers[1] ?? 0);
          activeOpacity = tv * config.buttonOpacity;
        } else {
          activeOpacity = pressed ? config.buttonOpacity : 0;
        }

        const effectiveColor = config.usePerButtonColors
          ? (baseLayout.buttonColors[btn.index] ?? config.buttonColor)
          : config.buttonColor;

        // Height for pill/rect shapes
        const hPct = btn.shape === "pill-h" || btn.shape === "rect" ? btn.size * 0.45 : btn.size;

        // Inner fade: for mask buttons the shape is centred in the element, so gradient at 50%/50%
        const gradCx = maskDef ? 50 : 50;
        const gradCy = maskDef ? 50 : 50;
        const bg = config.innerFade
          ? `radial-gradient(circle at ${gradCx}% ${gradCy}%, ${effectiveColor} 0%, ${hexToRgba(effectiveColor, 0.5)} 45%, transparent 100%)`
          : effectiveColor;

        const glowFilter = (!editMode && config.glowEnabled && activeOpacity > 0.01)
          ? `drop-shadow(0 0 ${config.glowSize}px ${hexToRgba(effectiveColor, 0.9)}) drop-shadow(0 0 ${config.glowSize * 2}px ${hexToRgba(effectiveColor, 0.45)})`
          : "none";

        const transitionProp = editMode
          ? "none"
          : isTrigger
          ? "opacity 0.06s linear, filter 0.06s linear"
          : "opacity 0.04s, filter 0.04s";

        const borderRadius =
          btn.shape === "circle" || btn.shape.startsWith("cross")
            ? "50%"
            : btn.shape === "rect"
            ? "8px"
            : "9999px";

        // For mask buttons, position at mask center (cx,cy) so mask aligns with controller bg
        // For geometric buttons, use layout x,y
        const posX = maskDef ? maskDef.cx : btn.x;
        const posY = maskDef ? maskDef.cy : btn.y;

        // For mask buttons at mask center, mask-position should be center (not offset)
        const maskStyle = maskDef
          ? {
              WebkitMaskImage: `url(${maskDef.url})`,
              maskImage: `url(${maskDef.url})`,
              WebkitMaskSize: `${renderedImgW}px ${renderedImgH}px`,
              maskSize: `${renderedImgW}px ${renderedImgH}px`,
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }
          : {};

        // DEBUG: In preview mode, show outline of all buttons so you can see them
        const debugStyle = {};

        return (
          <div
            key={btn.index}
            className="absolute pointer-events-none"
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
              width: `${btn.size}%`,
              height: `${hPct}%`,
              transform: "translate(-50%, -50%)",
              borderRadius: maskDef ? undefined : borderRadius,
              background: bg,
              backgroundColor: effectiveColor,
              opacity: activeOpacity,
              filter: glowFilter,
              transition: transitionProp,
              ...maskStyle,
              ...debugStyle,
            }}
          >
            {/* Label only shown for geometric (non-mask) buttons when labels are on */}
            {showButtonLabels && !maskDef && (
              <span
                className="absolute inset-0 flex items-center justify-center font-bold select-none"
                style={{ fontSize: "clamp(5px,1%,9px)", color: "#000", mixBlendMode: "multiply" }}
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

      {/* Trigger pressure bars (preview only) */}
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

      {/* Layout editor overlay (on top of button guides) */}
      {editMode && onOverridesChange && (
        <LayoutEditor
          layout={baseLayout}
          overrides={overrides}
          onOverridesChange={onOverridesChange}
          containerRef={containerRef}
        />
      )}

      {/* Connection status badge (preview only) */}
      {!editMode && (
        <div
          className={`absolute top-2 right-2 text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all ${
            gp.connected
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
          }`}
        >
          {gp.connected 
            ? "● Connected - Press buttons to test"
            : `○ ${baseLayout.connectMessage} - Press any button on controller`}
        </div>
      )}
      
      {!gp.connected && !editMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white/50 bg-black/60 rounded-xl p-6 max-w-xs mx-4">
            <div className="text-4xl mb-2">🎮</div>
            <p className="text-sm">No controller detected</p>
            <p className="text-xs mt-1">Press any button on your controller while this window is focused</p>
            <p className="text-xs mt-2 opacity-50">Supported: Xbox, PS4, PS5 controllers</p>
          </div>
        </div>
      )}
    </div>
  );
}
