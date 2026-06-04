import { useRef } from "react";
import { Upload, X, Gamepad2 } from "lucide-react";
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

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-card group">
          <img
            src={value}
            alt={label}
            className="w-full h-24 object-contain p-2 bg-white/5"
          />
          <button
            onClick={onClear}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
        >
          <Upload size={18} />
          <span className="text-xs">Click to upload PNG/WebP</span>
          {hint && <span className="text-[10px] opacity-60">{hint}</span>}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export function SkinPanel({ config, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Gamepad2 size={16} className="text-primary" />
        <span className="text-sm font-semibold">Skins</span>
      </div>

      <UploadSlot
        label="Controller Body"
        value={config.controllerSkin}
        hint="Full controller background image"
        onUpload={(url) => onChange({ controllerSkin: url })}
        onClear={() => onChange({ controllerSkin: null })}
      />

      <UploadSlot
        label="Left Thumbstick"
        value={config.leftStickSkin}
        hint="Square with transparent background"
        onUpload={(url) => onChange({ leftStickSkin: url })}
        onClear={() => onChange({ leftStickSkin: null })}
      />

      <UploadSlot
        label="Right Thumbstick"
        value={config.rightStickSkin}
        hint="Square with transparent background"
        onUpload={(url) => onChange({ rightStickSkin: url })}
        onClear={() => onChange({ rightStickSkin: null })}
      />

      <div className="mt-2 rounded-lg bg-muted/40 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/70 mb-1">Skin tips</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Use PNG with transparency for best results</li>
          <li>Controller skins from gamepadviewer.com work great</li>
          <li>Thumbstick skins should be square and centered</li>
          <li>Images are embedded in the exported HTML</li>
        </ul>
      </div>
    </div>
  );
}
