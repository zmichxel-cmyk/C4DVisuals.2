import { Settings, Download, Gamepad2 } from "lucide-react";
import { ControllerConfig, LayoutOverrides } from "../types/config";
import { CONTROLLER_TYPES, LAYOUTS } from "../lib/layouts";
import { generateExportHtml } from "../lib/exportHtml";

interface Props {
  config: ControllerConfig;
  overrides: LayoutOverrides;
  onChange: (updates: Partial<ControllerConfig>) => void;
  onControllerTypeChange: (type: ControllerConfig["controllerType"]) => void;
  showButtonLabels: boolean;
  onToggleLabels: (v: boolean) => void;
}

function LabeledSlider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-foreground/70 tabular-nums">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full cursor-pointer" />
    </div>
  );
}

export function ConfigPanel({ config, overrides, onChange, onControllerTypeChange, showButtonLabels, onToggleLabels }: Props) {
  const layout = LAYOUTS[config.controllerType] ?? LAYOUTS["xbox-one"];

  // Thumbstick size in pixels for the current output resolution
  const lStickBase = layout.sticks[0];
  const lStickEff = { ...lStickBase, ...(overrides.sticks[0] ?? {}) };
  const stickSizePx = Math.round(config.width * lStickEff.size / 100);

  function handleExport() {
    const html = generateExportHtml(config, overrides);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.controllerType}-overlay.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controller type selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Gamepad2 size={16} className="text-primary" />
          <span className="text-sm font-semibold">Controller Type</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {CONTROLLER_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => onControllerTypeChange(ct.id)}
              className={`text-xs py-2 px-1 rounded-md border transition-all font-medium ${
                config.controllerType === ct.id
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Settings size={16} className="text-primary" />
        <span className="text-sm font-semibold">Config</span>
      </div>

      {/* Button color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Button Highlight Color
        </label>
        <div className="flex items-center gap-2">
          <input type="color" value={config.buttonColor}
            onChange={(e) => onChange({ buttonColor: e.target.value })}
            className="w-9 h-9 rounded cursor-pointer border border-border bg-card p-0.5" />
          <span className="text-xs font-mono text-foreground/60">{config.buttonColor}</span>
        </div>
      </div>

      <LabeledSlider label="Highlight Opacity" value={config.buttonOpacity}
        min={0.05} max={1} step={0.05}
        display={`${Math.round(config.buttonOpacity * 100)}%`}
        onChange={(v) => onChange({ buttonOpacity: v })} />

      <LabeledSlider label="Stick Travel" value={config.stickTravel}
        min={4} max={40} step={1}
        display={`${config.stickTravel}px`}
        onChange={(v) => onChange({ stickTravel: v })} />

      {/* Output size */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output Size</label>
        <div className="grid grid-cols-2 gap-2">
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
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thumbstick size callout */}
      <div className="rounded-lg bg-primary/10 border border-primary/25 p-3 space-y-1">
        <p className="text-xs font-semibold text-primary">Thumbstick Image Size</p>
        <p className="text-[12px] font-mono font-bold text-foreground">
          {stickSizePx} × {stickSizePx} px
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Make your thumbstick PNGs at least this size for the current output ({config.width}×{config.height}).
          Use the Edit Layout tool to resize the stick zone, which updates this number.
        </p>
      </div>

      {/* Show button labels toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Show Labels</label>
        <button onClick={() => onToggleLabels(!showButtonLabels)}
          className={`relative w-10 h-5 rounded-full transition-colors ${showButtonLabels ? "bg-primary" : "bg-muted"}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showButtonLabels ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* OBS instructions */}
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/70 mb-1">OBS / Streamlabs setup</p>
        <ol className="space-y-0.5 list-decimal list-inside">
          <li>Export HTML below</li>
          <li>Add a <b className="text-foreground/60">Browser Source</b></li>
          <li>Check <b className="text-foreground/60">Local file</b>, select the HTML</li>
          <li>Set width/height to {config.width}×{config.height}</li>
          <li>Enable <b className="text-foreground/60">Shutdown when not visible</b></li>
        </ol>
      </div>

      <button onClick={handleExport}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25">
        <Download size={16} />
        Export HTML for OBS
      </button>
    </div>
  );
}
