import { useRef } from "react";
import { Upload, X, ImageIcon, Film, Settings2 } from "lucide-react";
import { ControllerConfig } from "../types/config";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

interface Props {
  config: ControllerConfig;
  onChange: (updates: Partial<ControllerConfig>) => void;
  stickSizePx: number;
  bodySizeLabel: string;
}

interface UploadSlotProps {
  label: string;
  value: string | null;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
  hint?: string;
}

/** Returns true if the skin value is an animated WebM (base64 data URL or blob URL). */
function isVideoSkin(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith("data:video/") || value.startsWith("blob:");
}

/** Simple upload slot for stick skins (image only, no video options). */
function UploadSlot({ label, value, onUpload, onClear, hint }: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") onUpload(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const isTemplate = value && !value.startsWith("data:");

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {value ? (
        <div className="relative rounded-lg border border-border group" style={{
          backgroundImage: "linear-gradient(45deg, #2a2a35 25%, transparent 25%), linear-gradient(-45deg, #2a2a35 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a35 75%), linear-gradient(-45deg, transparent 75%, #2a2a35 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
          backgroundColor: "#1a1a22",
        }}>
          <div className="w-full h-28 p-3">
            <img src={value} alt={label} className="w-full h-full object-contain" />
          </div>
          {isTemplate && (
            <div className="absolute top-1.5 left-1.5 text-[9px] bg-primary/80 text-white px-1.5 py-0.5 rounded font-medium">
              Template
            </div>
          )}
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => inputRef.current?.click()}
              className="p-1 rounded-full bg-black/60 text-white hover:bg-primary transition-colors">
              <Upload size={11} />
            </button>
            <button onClick={onClear}
              className="p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors">
              <X size={11} />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground">
          <Upload size={18} />
          <span className="text-xs">Upload PNG / WebP</span>
          {hint && <span className="text-[10px] opacity-60">{hint}</span>}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/webp,image/jpeg,image/gif"
        className="hidden" onChange={handleFile} />
    </div>
  );
}

/** Controller Body slot — supports PNG and WebM, with a popover for video settings. */
function BodySlot({ config, onChange }: { config: ControllerConfig; onChange: (u: Partial<ControllerConfig>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isVideo = isVideoSkin(config.controllerSkin);
  const isTemplate = config.controllerSkin && !config.controllerSkin.startsWith("data:");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") onChange({ controllerSkin: result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Controller Body</label>

      {config.controllerSkin ? (
        <Popover>
          <div className="relative rounded-lg border border-border group" style={{
            backgroundImage: "linear-gradient(45deg, #2a2a35 25%, transparent 25%), linear-gradient(-45deg, #2a2a35 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a35 75%), linear-gradient(-45deg, transparent 75%, #2a2a35 75%)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
            backgroundColor: "#1a1a22",
          }}>
            <div className="w-full h-28 p-3">
              {isVideo ? (
                <video src={config.controllerSkin} autoPlay loop muted playsInline
                  className="w-full h-full object-contain" />
              ) : (
                <img src={config.controllerSkin} alt="Controller Body" className="w-full h-full object-contain" />
              )}
            </div>

            {/* Badges */}
            {isVideo && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] bg-violet-600/90 text-white px-1.5 py-0.5 rounded font-medium">
                <Film size={9} /> WebM
              </div>
            )}
            {isTemplate && !isVideo && (
              <div className="absolute top-1.5 left-1.5 text-[9px] bg-primary/80 text-white px-1.5 py-0.5 rounded font-medium">
                Template
              </div>
            )}

            {/* Hover actions */}
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => inputRef.current?.click()}
                className="p-1 rounded-full bg-black/60 text-white hover:bg-primary transition-colors"
                title="Replace skin">
                <Upload size={11} />
              </button>
              {isVideo && (
                <PopoverTrigger asChild>
                  <button
                    className="p-1 rounded-full bg-black/60 text-violet-300 hover:bg-violet-600 transition-colors"
                    title="Video options">
                    <Settings2 size={11} />
                  </button>
                </PopoverTrigger>
              )}
              <button onClick={() => onChange({ controllerSkin: null })}
                className="p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors"
                title="Remove skin">
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Video options popover — WebM only */}
          <PopoverContent side="right" sideOffset={8} align="start" className="w-56 p-3 space-y-3">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Film size={10} className="text-violet-400" /> WebM Options
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fit</label>
              <div className="grid grid-cols-2 gap-1">
                {(["contain", "cover"] as const).map((mode) => {
                  const active = (config.controllerSkinVideoFit ?? "contain") === mode;
                  return (
                    <button key={mode} onClick={() => onChange({ controllerSkinVideoFit: mode })}
                      className={`flex flex-col items-center py-1.5 rounded text-[10px] border transition-all ${
                        active
                          ? "bg-violet-600/20 border-violet-500/60 text-violet-300"
                          : "bg-muted/20 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}>
                      <span className="font-semibold capitalize">{mode}</span>
                      <span className="opacity-60 mt-0.5">{mode === "contain" ? "Letterbox" : "Crop sides"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground">Contrast</label>
                <span className="text-[10px] font-mono text-muted-foreground">{(config.controllerSkinContrast ?? 1).toFixed(2)}×</span>
              </div>
              <input type="range" min="0.5" max="2" step="0.01"
                value={config.controllerSkinContrast ?? 1}
                onChange={(e) => onChange({ controllerSkinContrast: parseFloat(e.target.value) })}
                className="w-full h-1 accent-violet-500" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground">Saturation</label>
                <span className="text-[10px] font-mono text-muted-foreground">{(config.controllerSkinSaturate ?? 1).toFixed(2)}×</span>
              </div>
              <input type="range" min="0.5" max="2" step="0.01"
                value={config.controllerSkinSaturate ?? 1}
                onChange={(e) => onChange({ controllerSkinSaturate: parseFloat(e.target.value) })}
                className="w-full h-1 accent-violet-500" />
            </div>

            <p className="text-[9px] text-muted-foreground/50 leading-snug border-t border-border pt-2">
              Washed out? Try Contrast 1.15 + Saturation 1.10. Permanent fix: re-encode with{" "}
              <code className="bg-muted/40 px-0.5 rounded">-color_range 2</code> in FFmpeg.
            </p>
          </PopoverContent>
        </Popover>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground">
          <Upload size={18} />
          <span className="text-xs">Upload PNG / WebP / WebM</span>
          <span className="text-[10px] opacity-60">Full controller background</span>
        </button>
      )}

      <input ref={inputRef} type="file"
        accept="image/png,image/webp,image/jpeg,image/gif,video/webm"
        className="hidden" onChange={handleFile} />
    </div>
  );
}

export { isVideoSkin };

export function SkinPanel({ config, onChange, stickSizePx, bodySizeLabel }: Props) {
  return (
    <div className="flex flex-col gap-5 p-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <ImageIcon size={16} className="text-primary" />
        <span className="text-sm font-semibold">Skins</span>
      </div>

      <BodySlot config={config} onChange={onChange} />

      <div className="flex items-center justify-between gap-2 rounded-md bg-primary/10 border border-primary/20 px-2 py-1.5">
        <span className="text-[10px] font-semibold text-primary">Body PNG size</span>
        <span className="text-xs font-mono font-bold">{bodySizeLabel}</span>
      </div>

      <UploadSlot
        label="Left Thumbstick"
        value={config.leftStickSkin}
        hint="Square PNG, transparent bg"
        onUpload={(url) => onChange({ leftStickSkin: url })}
        onClear={() => onChange({ leftStickSkin: null })}
      />

      <UploadSlot
        label="Right Thumbstick"
        value={config.rightStickSkin}
        hint="Square PNG, transparent bg"
        onUpload={(url) => onChange({ rightStickSkin: url })}
        onClear={() => onChange({ rightStickSkin: null })}
      />

      <div className="flex items-center justify-between gap-2 rounded-md bg-primary/10 border border-primary/20 px-2 py-1.5">
        <span className="text-[10px] font-semibold text-primary">Stick PNG size</span>
        <span className="text-xs font-mono font-bold">{stickSizePx} × {stickSizePx} px</span>
      </div>

      <div className="rounded-lg bg-muted/30 border border-border/50 p-2.5 text-[10px] text-muted-foreground/70 leading-snug">
        <p className="font-medium text-foreground/50 mb-1">Skin tips</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>PNG with transparency for static skins</li>
          <li>VP9 WebM (yuva420p) for animated body skins</li>
          <li>Sticks must be <b className="text-foreground/50">square</b> — use size above</li>
          <li>All skins embed in the exported HTML</li>
        </ul>
      </div>
    </div>
  );
}
