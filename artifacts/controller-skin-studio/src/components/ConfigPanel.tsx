import { Settings, Download } from "lucide-react";
import { ControllerConfig } from "../types/config";
import { generateExportHtml } from "../lib/exportHtml";

interface Props {
  config: ControllerConfig;
  onChange: (updates: Partial<ControllerConfig>) => void;
  showButtonLabels: boolean;
  onToggleLabels: (v: boolean) => void;
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        <span className="text-xs font-mono text-foreground/70 tabular-nums">
          {display ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
      />
    </div>
  );
}

export function ConfigPanel({ config, onChange, showButtonLabels, onToggleLabels }: Props) {
  function handleExport() {
    const html = generateExportHtml(config);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "controller-overlay.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Settings size={16} className="text-primary" />
        <span className="text-sm font-semibold">Config</span>
      </div>

      {/* Button color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Button Highlight Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={config.buttonColor}
            onChange={(e) => onChange({ buttonColor: e.target.value })}
            className="w-9 h-9 rounded cursor-pointer border border-border bg-card p-0.5"
          />
          <span className="text-xs font-mono text-foreground/60">{config.buttonColor}</span>
        </div>
      </div>

      {/* Sliders */}
      <LabeledSlider
        label="Highlight Opacity"
        value={config.buttonOpacity}
        min={0.05}
        max={1}
        step={0.05}
        display={`${Math.round(config.buttonOpacity * 100)}%`}
        onChange={(v) => onChange({ buttonOpacity: v })}
      />

      <LabeledSlider
        label="Stick Travel"
        value={config.stickTravel}
        min={4}
        max={40}
        step={1}
        display={`${config.stickTravel}px`}
        onChange={(v) => onChange({ stickTravel: v })}
      />

      {/* Output size */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Output Size
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "1280×720", w: 1280, h: 720 },
            { label: "1024×576", w: 1024, h: 576 },
            { label: "800×450", w: 800, h: 450 },
            { label: "640×360", w: 640, h: 360 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => onChange({ width: preset.w, height: preset.h })}
              className={`text-xs px-2 py-1.5 rounded-md border transition-all ${
                config.width === preset.w && config.height === preset.h
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Show button labels toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Show Button Labels
        </label>
        <button
          onClick={() => onToggleLabels(!showButtonLabels)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            showButtonLabels ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              showButtonLabels ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* OBS instructions */}
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/70 mb-1">OBS / Streamlabs setup</p>
        <ol className="space-y-0.5 list-decimal list-inside">
          <li>Export the HTML file below</li>
          <li>In OBS, add a <b className="text-foreground/60">Browser Source</b></li>
          <li>Check <b className="text-foreground/60">Local file</b> and select the HTML</li>
          <li>Set width/height to match the output size</li>
          <li>Enable <b className="text-foreground/60">Shutdown when not visible</b></li>
        </ol>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
      >
        <Download size={16} />
        Export HTML for OBS
      </button>
    </div>
  );
}
