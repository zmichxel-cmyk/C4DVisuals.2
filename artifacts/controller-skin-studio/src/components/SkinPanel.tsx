import { useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { ControllerConfig } from "../types/config";

interface Props {
  config: ControllerConfig;
  onChange: (updates: Partial<ControllerConfig>) => void;
}

interface UploadSlotProps {
  label: string;
  value: string | null;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
  hint?: string;
}

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

  // Check if it's a URL (template) vs base64 upload
  const isTemplate = value && !value.startsWith("data:");

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-card group">
          <img src={value} alt={label} className="w-full h-24 object-contain p-2 bg-white/5" />
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
          className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground">
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

export function SkinPanel({ config, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <ImageIcon size={16} className="text-primary" />
        <span className="text-sm font-semibold">Skins</span>
      </div>

      <UploadSlot
        label="Controller Body"
        value={config.controllerSkin}
        hint="Full controller background"
        onUpload={(url) => onChange({ controllerSkin: url })}
        onClear={() => onChange({ controllerSkin: null })}
      />

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

      <div className="rounded-lg bg-muted/40 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/70 mb-1.5">Skin tips</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Use <b className="text-foreground/60">PNG with transparency</b> for best results</li>
          <li>The template image loads automatically when you switch controller type</li>
          <li>Thumbstick PNGs should be <b className="text-foreground/60">square</b> and centered on the stick cap</li>
          <li>Check <b className="text-foreground/60">Config → Thumbstick Image Size</b> for the exact px size to use</li>
          <li>All images are embedded in the exported HTML — no external files needed</li>
        </ul>
      </div>
    </div>
  );
}
