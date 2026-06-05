import { Settings, Download, Gamepad2, Zap, Layers, Palette, Tag } from "lucide-react";
import { ControllerConfig, LayoutOverrides } from "../types/config";
import { CONTROLLER_TYPES, LAYOUTS } from "../lib/layouts";
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
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function LabeledSlider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-mono tabular-nums text-foreground/70">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full cursor-pointer" />
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1.5 border-b border-border">
      <Icon size={14} className="text-primary" />
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">{title}</span>
    </div>
  );
}

export function ConfigPanel({ config, overrides, onChange, onResetOverrides, showButtonLabels, onToggleLabels }: Props) {
  const layout = LAYOUTS[config.controllerType] ?? LAYOUTS["xbox-one"];

  const lStickBase = layout.sticks[0];
  const lStickEff = { ...lStickBase, ...(overrides.sticks[0] ?? {}) };
  const stickSizePx = Math.round(config.width * lStickEff.size / 100);

  function handleExport() {
    const html = generateExportHtml(config, overrides);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (config.overlayName || "overlay").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    a.download = `${safeName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Overlay name */}
      <div className="space-y-1.5">
        <SectionHeader icon={Tag} title="Overlay Name" />
        <input
          type="text"
          value={config.overlayName}
          onChange={(e) => onChange({ overlayName: e.target.value })}
          placeholder="My Controller"
          className="w-full text-xs px-2.5 py-2 rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
        />
        <p className="text-[10px] text-muted-foreground">Used as the exported filename</p>
      </div>

      {/* Controller type */}
      <div className="space-y-2">
        <SectionHeader icon={Gamepad2} title="Controller Type" />
        <div className="grid grid-cols-3 gap-1.5">
          {CONTROLLER_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => {
                const l = LAYOUTS[ct.id];
                onChange({
                  controllerType: ct.id,
                  controllerSkin: l.defaultSkinUrl,
                  leftStickSkin: l.defaultLeftStickUrl,
                  rightStickSkin: l.defaultRightStickUrl,
                  width: l.defaultWidth,
                  height: l.defaultHeight,
                  stickTravel: 16,
                });
                onResetOverrides();
              }}
              className={`text-xs py-2 px-1 rounded-md border transition-all font-medium ${
                config.controllerType === ct.id
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <SectionHeader icon={Palette} title="Appearance" />

        {/* Color */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Highlight Color</label>
            {config.usePerButtonColors && (
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">per-button</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={config.buttonColor}
              disabled={config.usePerButtonColors}
              onChange={(e) => onChange({ buttonColor: e.target.value })}
              className="w-9 h-9 rounded cursor-pointer border border-border bg-card p-0.5 disabled:opacity-30 disabled:cursor-not-allowed" />
            <span className="text-xs font-mono text-foreground/50">{config.buttonColor}</span>
          </div>
        </div>

        <Toggle
          label="Per-button colors (PS/Xbox palette)"
          value={config.usePerButtonColors}
          onChange={(v) => onChange({ usePerButtonColors: v })}
        />

        <LabeledSlider label="Opacity" value={config.buttonOpacity}
          min={0.05} max={1} step={0.05}
          display={`${Math.round(config.buttonOpacity * 100)}%`}
          onChange={(v) => onChange({ buttonOpacity: v })} />
      </div>

      {/* Effects */}
      <div className="space-y-3">
        <SectionHeader icon={Zap} title="Effects" />

        <Toggle label="Glow" value={config.glowEnabled} onChange={(v) => onChange({ glowEnabled: v })} />
        {config.glowEnabled && (
          <LabeledSlider label="Glow spread" value={config.glowSize}
            min={4} max={40} step={1}
            display={`${config.glowSize}px`}
            onChange={(v) => onChange({ glowSize: v })} />
        )}

        <Toggle label="Inner fade (radial gradient)" value={config.innerFade} onChange={(v) => onChange({ innerFade: v })} />
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <SectionHeader icon={Settings} title="Settings" />

        <LabeledSlider label="Stick travel" value={config.stickTravel}
          min={4} max={40} step={1}
          display={`${config.stickTravel}px`}
          onChange={(v) => onChange({ stickTravel: v })} />

        {/* Output size */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Output Size</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "1024×1024", w: 1024, h: 1024 },
              { label: "800×800",   w: 800,  h: 800  },
              { label: "1280×720",  w: 1280, h: 720  },
              { label: "1024×576",  w: 1024, h: 576  },
            ].map((p) => (
              <button key={p.label}
                onClick={() => onChange({ width: p.w, height: p.h })}
                className={`text-xs px-2 py-1.5 rounded-md border transition-all ${
                  config.width === p.w && config.height === p.h
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thumbstick size callout */}
        <div className="rounded-lg bg-primary/10 border border-primary/25 p-2.5 space-y-0.5">
          <p className="text-[10px] font-semibold text-primary">Thumbstick Image Size</p>
          <p className="text-sm font-mono font-bold">{stickSizePx} × {stickSizePx} px</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Make thumbstick PNGs at least this size for {config.width}×{config.height} output.
          </p>
        </div>

        <Toggle label="Show button labels" value={showButtonLabels} onChange={onToggleLabels} />
      </div>

      {/* OBS instructions */}
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-[10px] text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground/60 mb-1">OBS / Streamlabs setup</p>
        <ol className="space-y-0.5 list-decimal list-inside">
          <li>Export HTML below</li>
          <li>Add a <b className="text-foreground/50">Browser Source</b></li>
          <li>Check <b className="text-foreground/50">Local file</b>, select the HTML</li>
          <li>Set size to {config.width}×{config.height}</li>
          <li>Enable <b className="text-foreground/50">Shutdown when not visible</b></li>
        </ol>
      </div>

      <button onClick={handleExport}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30">
        <Download size={15} />
        Export HTML for OBS
      </button>
    </div>
  );
}
