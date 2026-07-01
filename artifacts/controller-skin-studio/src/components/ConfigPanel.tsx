import { useState } from "react";
import { Settings, Download, Zap, Palette, Tag, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { ControllerConfig, LayoutOverrides } from "../types/config";
import { LAYOUTS } from "../lib/layouts";
import { generateExportHtml } from "../lib/exportHtml";

interface Props {
  config: ControllerConfig;
  overrides: LayoutOverrides;
  onChange: (updates: Partial<ControllerConfig>) => void;
  onResetOverrides: () => void;
  showButtonLabels: boolean;
  onToggleLabels: (v: boolean) => void;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground leading-tight flex-1">{label}</span>
      <button onClick={() => onChange(!value)} style={{ minWidth: "36px" }}
        className={`relative flex-none w-9 h-5 rounded-full transition-colors duration-200 ${value ? "bg-primary" : "bg-muted"}`}>
        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
          style={{ left: value ? "calc(100% - 18px)" : "2px" }} />
      </button>
    </div>
  );
}

function Slider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number; display?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-mono text-foreground/60">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full cursor-pointer" />
    </div>
  );
}

function Section({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-1.5 pb-0.5 border-b border-border">
      <Icon size={11} className="text-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">{title}</span>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      <span className="text-xs text-muted-foreground leading-tight truncate">{label}</span>
      <div className="flex items-center gap-1 flex-none">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-border bg-card p-0.5" />
        <span className="text-[10px] font-mono text-foreground/50 w-[52px]">{value}</span>
      </div>
    </div>
  );
}

function Dropdown({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-card hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-1.5">
          <Icon size={11} className="text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">{title}</span>
        </div>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1.5 border-t border-border bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
}

export function ConfigPanel({ config, overrides, onChange, onResetOverrides, showButtonLabels, onToggleLabels }: Props) {
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"appearance" | "effects">("appearance");
  const layout = LAYOUTS[config.controllerType] ?? LAYOUTS["xbox-one"];
  const lStickBase = layout.sticks[0];
  const lStickEff = { ...lStickBase, ...(overrides.sticks[0] ?? {}) };
  const stickSizePx = Math.round(config.width * lStickEff.size / 100);

  async function handleExport() {
    setExporting(true);
    try {
      const html = await generateExportHtml(config, overrides);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(config.overlayName || "overlay").replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* Scrollable content */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">

      {/* Overlay name */}
      <div className="space-y-1">
        <Section icon={Tag} title="Name" />
        <input type="text" value={config.overlayName} onChange={e => onChange({ overlayName: e.target.value })}
          placeholder="My Controller"
          className="w-full text-xs px-2 py-1 rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5">
        {(["appearance", "effects"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-all font-medium capitalize ${activeTab === tab ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
            {tab === "appearance" ? "Appearance" : "Effects"}
          </button>
        ))}
      </div>

      {activeTab === "appearance" && (
        <>
          {/* Stick Colors dropdown */}
          <Dropdown title="Stick Colors" icon={Palette}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Link stick colors</span>
              <button onClick={() => onChange({ linkStickColors: !config.linkStickColors })} style={{ minWidth: "36px" }}
                className={`relative flex-none w-9 h-5 rounded-full transition-colors duration-200 ${config.linkStickColors ? "bg-primary" : "bg-muted"}`}>
                <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
                  style={{ left: config.linkStickColors ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
            {config.linkStickColors ? (
              <div className="flex items-center gap-2">
                <input type="color" value={config.leftStickColor} onChange={e => onChange({ leftStickColor: e.target.value, rightStickColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5 flex-none" />
                <div>
                  <p className="text-xs font-medium text-foreground">Both Sticks</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{config.leftStickColor}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.leftStickColor} onChange={e => onChange({ leftStickColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5 flex-none" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Left Stick</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{config.leftStickColor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.rightStickColor} onChange={e => onChange({ rightStickColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5 flex-none" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Right Stick</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{config.rightStickColor}</p>
                  </div>
                </div>
              </>
            )}
            <Toggle label="Glow" value={config.stickGlowEnabled} onChange={v => onChange({ stickGlowEnabled: v })} />
            {config.stickGlowEnabled && (
              <>
                <Slider label="Glow Intensity" value={config.stickGlowIntensity ?? 0.85} min={0.05} max={1} step={0.05}
                  display={`${Math.round((config.stickGlowIntensity ?? 0.85) * 100)}%`}
                  onChange={v => onChange({ stickGlowIntensity: v })} />
                <Slider label="Glow Spread" value={config.stickGlowSize} min={2} max={40} step={1}
                  display={`${config.stickGlowSize}px`} onChange={v => onChange({ stickGlowSize: v })} />
              </>
            )}
            <Toggle label="Rim Highlight" value={config.stickHighlightEnabled ?? true} onChange={v => onChange({ stickHighlightEnabled: v })} />
            {(config.stickHighlightEnabled ?? true) && (
              <>
                <Slider label="Intensity" value={config.stickHighlightIntensity ?? 0.35} min={0.05} max={1} step={0.05}
                  display={`${Math.round((config.stickHighlightIntensity ?? 0.35) * 100)}%`}
                  onChange={v => onChange({ stickHighlightIntensity: v })} />
                <div className="flex items-center gap-2">
                  <input type="color" value={config.stickHighlightColor ?? "#ffffff"}
                    onChange={e => onChange({ stickHighlightColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5 flex-none" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Highlight Color</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{config.stickHighlightColor ?? "#ffffff"}</p>
                  </div>
                </div>
              </>
            )}
            <Toggle label="Drop Shadow" value={config.stickShadowEnabled ?? true} onChange={v => onChange({ stickShadowEnabled: v })} />
            {(config.stickShadowEnabled ?? true) && (
              <>
                <Slider label="Intensity" value={config.stickShadowIntensity ?? 0.65} min={0.05} max={1} step={0.05}
                  display={`${Math.round((config.stickShadowIntensity ?? 0.65) * 100)}%`}
                  onChange={v => onChange({ stickShadowIntensity: v })} />
                <Slider label="Distance" value={config.stickShadowDistance ?? 10} min={1} max={40} step={1}
                  display={`${config.stickShadowDistance ?? 10}px`}
                  onChange={v => onChange({ stickShadowDistance: v })} />
                <Slider label="Angle" value={config.stickShadowAngle ?? 135} min={0} max={360} step={1}
                  display={`${config.stickShadowAngle ?? 135}°`}
                  onChange={v => onChange({ stickShadowAngle: v })} />
              </>
            )}
          </Dropdown>

          {/* Button Press dropdown */}
          <Dropdown title="Button Press" icon={Zap}>
            <div className="flex items-center gap-2">
              <input type="color" value={config.buttonColor} onChange={e => onChange({ buttonColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5 flex-none" />
              <div>
                <p className="text-xs font-medium text-foreground">Button Press Color</p>
                <p className="text-[10px] font-mono text-muted-foreground">{config.buttonColor}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <Toggle label="Inner fade" value={config.innerFade} onChange={v => onChange({ innerFade: v })} />
              <Toggle label="Outer fade" value={config.outerFade} onChange={v => onChange({ outerFade: v })} />
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <Toggle label="Glow" value={config.glowEnabled} onChange={v => onChange({ glowEnabled: v })} />
              <Toggle label="Stroke" value={config.strokeEnabled} onChange={v => onChange({ strokeEnabled: v })} />
            </div>
            {config.glowEnabled && (
              <>
                <Slider label="Opacity" value={config.buttonOpacity} min={0.05} max={1} step={0.05}
                  display={`${Math.round(config.buttonOpacity * 100)}%`} onChange={v => onChange({ buttonOpacity: v })} />
                <Slider label="Glow Spread" value={config.glowSize} min={4} max={40} step={1}
                  display={`${config.glowSize}px`} onChange={v => onChange({ glowSize: v })} />
              </>
            )}
            {config.strokeEnabled && (
              <>
                <Slider label="Stroke Width" value={config.strokeWidth} min={1} max={8} step={0.5}
                  display={`${config.strokeWidth}px`} onChange={v => onChange({ strokeWidth: v })} />
                <div className="flex items-center gap-2">
                  <input type="color" value={config.strokeColor} onChange={e => onChange({ strokeColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5 flex-none" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Stroke Color</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{config.strokeColor}</p>
                  </div>
                </div>
              </>
            )}
          </Dropdown>
        </>
      )}

      {activeTab === "effects" && (
        <>
          {/* Body Effects dropdown */}
          <Dropdown title="Body Effects" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-1">
              {([
                { id: "none",           label: "None"          },
                { id: "pulseGlow",      label: "Pulse Glow"    },
                { id: "particles",      label: "Particles"     },
                { id: "fire",           label: "🔥 Fire"       },
                { id: "reactive",       label: "⚡ Reactive"   },
                { id: "orbitTrail",     label: "🌀 Orbit Trail" },
                { id: "lightningStrike",label: "⚡ Lightning"  },
              ] as const).map(p => (
                <button key={p.id} onClick={() => onChange({ bodyEffect: p.id })}
                  className={`text-xs px-1.5 py-1 rounded border transition-all ${config.bodyEffect === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {config.bodyEffect !== "none" && (
              <>
                {config.bodyEffect !== "fire" && (
                  <Slider label="Speed" value={config.bodyEffectSpeed} min={1} max={20} step={0.5}
                    display={`${config.bodyEffectSpeed}s`} onChange={v => onChange({ bodyEffectSpeed: v })} />
                )}
                <Slider label="Intensity" value={config.bodyEffectIntensity} min={0.05} max={1} step={0.05}
                  display={`${Math.round(config.bodyEffectIntensity * 100)}%`} onChange={v => onChange({ bodyEffectIntensity: v })} />
                {config.bodyEffect === "pulseGlow" && (
                  <ColorField label="Color" value={config.pulseGlowColor} onChange={v => onChange({ pulseGlowColor: v })} />
                )}
                {(config.bodyEffect === "reactive" || config.bodyEffect === "orbitTrail" || config.bodyEffect === "lightningStrike" || config.bodyEffect === "crystalFracture") && (
                  <>
                    <Toggle label="Rainbow" value={config.reactiveRippleRainbow} onChange={v => onChange({ reactiveRippleRainbow: v })} />
                    {!config.reactiveRippleRainbow && (
                      <ColorField label="Color" value={config.reactiveRippleColor} onChange={v => onChange({ reactiveRippleColor: v })} />
                    )}
                  </>
                )}
                {config.bodyEffect === "fire" && (
                  <>
                    <ColorField label="Fire Color 1" value={config.fireColor1} onChange={v => onChange({ fireColor1: v })} />
                    <ColorField label="Fire Color 2" value={config.fireColor2} onChange={v => onChange({ fireColor2: v })} />
                    <Slider label="Glow Speed" value={config.fireGlowSpeed} min={1} max={20} step={0.5}
                      display={`${config.fireGlowSpeed}s`} onChange={v => onChange({ fireGlowSpeed: v })} />
                    <Slider label="Ember Speed" value={config.fireEmberSpeed} min={1} max={20} step={0.5}
                      display={`${config.fireEmberSpeed}s`} onChange={v => onChange({ fireEmberSpeed: v })} />
                  </>
                )}
              </>
            )}
          </Dropdown>

          {/* RGB Body dropdown */}
          <Dropdown title="RGB Body" icon={Sparkles}>
            <Toggle label="Enable RGB silhouette" value={config.rgbBodyEnabled} onChange={v => onChange({ rgbBodyEnabled: v })} />
            {config.rgbBodyEnabled && (
              <>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { id: "wave",      label: "Wave"      },
                    { id: "breathing", label: "Breathing" },
                    { id: "reactive",  label: "Reactive"  },
                  ] as const).map(m => (
                    <button key={m.id} onClick={() => onChange({ rgbBodyMode: m.id })}
                      className={`text-xs px-1.5 py-1 rounded border transition-all ${config.rgbBodyMode === m.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <Slider label="Speed" value={config.rgbBodySpeed} min={1} max={20} step={0.5}
                  display={`${config.rgbBodySpeed}s`} onChange={v => onChange({ rgbBodySpeed: v })} />
                <Slider label="Intensity" value={config.rgbBodyIntensity} min={0.05} max={1} step={0.05}
                  display={`${Math.round(config.rgbBodyIntensity * 100)}%`} onChange={v => onChange({ rgbBodyIntensity: v })} />
                {config.rgbBodyMode === "wave" ? (
                  <>
                    <Toggle label="Rainbow (Wave)" value={config.rgbBodyWaveRainbow} onChange={v => onChange({ rgbBodyWaveRainbow: v })} />
                    {!config.rgbBodyWaveRainbow && (
                      <ColorField label="Wave Color" value={config.rgbBodyWaveColor} onChange={v => onChange({ rgbBodyWaveColor: v })} />
                    )}
                  </>
                ) : config.rgbBodyMode === "breathing" ? (
                  <>
                    <Toggle label="Rainbow (Breathing)" value={config.rgbBodyBreathingRainbow} onChange={v => onChange({ rgbBodyBreathingRainbow: v })} />
                    {!config.rgbBodyBreathingRainbow && (
                      <ColorField label="Breathing Color" value={config.rgbBodyBreathingColor} onChange={v => onChange({ rgbBodyBreathingColor: v })} />
                    )}
                  </>
                ) : (
                  <>
                    <Toggle label="Rainbow (Reactive)" value={config.rgbBodyReactiveRainbow} onChange={v => onChange({ rgbBodyReactiveRainbow: v })} />
                    {!config.rgbBodyReactiveRainbow && (
                      <ColorField label="Ripple Color" value={config.rgbBodyReactiveColor} onChange={v => onChange({ rgbBodyReactiveColor: v })} />
                    )}
                  </>
                )}
              </>
            )}
          </Dropdown>

          {/* Settings dropdown */}
          <Dropdown title="Settings" icon={Settings}>
            <Toggle label="Watermark" value={config.showWatermark} onChange={v => onChange({ showWatermark: v })} />
            <Toggle label="Drop Shadow" value={config.showShadow} onChange={v => onChange({ showShadow: v })} />
            {config.showShadow && (
              <>
                <Slider label="Shadow Intensity" value={config.shadowIntensity} min={0.1} max={1} step={0.05}
                  display={`${Math.round(config.shadowIntensity * 100)}%`} onChange={v => onChange({ shadowIntensity: v })} />
                <Slider label="Shadow Angle" value={config.shadowAngle} min={0} max={360} step={1}
                  display={`${config.shadowAngle}°`} onChange={v => onChange({ shadowAngle: v })} />
              </>
            )}
          </Dropdown>
        </>
      )}

      </div>{/* end scrollable content */}

      {/* Export — always pinned at bottom */}
      <div className="space-y-1 pt-1 border-t border-border">
        <p className="text-[10px] text-muted-foreground">OBS Browser Source: {config.width}×{Math.round(config.width * layout.skinHeight / layout.skinWidth)}</p>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-wait">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? "Exporting…" : "Export HTML for OBS"}
        </button>
      </div>
    </div>
  );
}

