import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Film, Settings2 } from "lucide-react";
import { ControllerConfig, ControllerType } from "../types/config";
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
  onOpenLibrary?: () => void;
}

// ── Thumbstick library ─────────────────────────────────────────────────────
// Drop a PNG into  public/sticks/  then add ONE entry here.
// The same library is shown for both the left and right slots — pick any
// stick for either side. If your stick is asymmetric (different left/right
// shapes) just add both PNGs as separate entries.
//
// C4D.1 + C4D.1 Edge  → C4D1_STICKS
// C4D.4 + C4D.5 + C4D.5 Edge  → PS_STICKS

type StickEntry = { id: string; name: string; url: string };

const C4D1_STICKS: StickEntry[] = [
  { id:"c4d1-anodized",            name:"Anodized",          url:"/sticks/c4d1-anodized.png" },
  { id:"c4d1-antique",             name:"Antique",           url:"/sticks/c4d1-antique.png" },
  { id:"c4d1-black",               name:"Black",             url:"/sticks/c4d1-black.png" },
  { id:"c4d1-black-carbon",        name:"Black Carbon",      url:"/sticks/c4d1-black-carbon.png" },
  { id:"c4d1-bronze",              name:"Bronze",            url:"/sticks/c4d1-bronze.png" },
  { id:"c4d1-ceramic-blue",        name:"Ceramic Blue",      url:"/sticks/c4d1-ceramic-blue.png" },
  { id:"c4d1-chrome",              name:"Chrome",            url:"/sticks/c4d1-chrome.png" },
  { id:"c4d1-fools-gold",          name:"Fools Gold",        url:"/sticks/c4d1-fools-gold.png" },
  { id:"c4d1-glossy-black",        name:"Glossy Black",      url:"/sticks/c4d1-glossy-black.png" },
  { id:"c4d1-gold",                name:"Gold",              url:"/sticks/c4d1-gold.png" },
  { id:"c4d1-idk",                 name:"Gray",              url:"/sticks/c4d1-idk.png" },
  { id:"c4d1-jade",                name:"Jade",              url:"/sticks/c4d1-jade.png" },
  { id:"c4d1-knurled-titanium",    name:"Knurled Titanium",  url:"/sticks/c4d1-knurled-titanium.png" },
  { id:"c4d1-light-blue",          name:"Light Blue",        url:"/sticks/c4d1-light-blue.png" },
  { id:"c4d1-mechanical-chrome",   name:"Mechanical Chrome", url:"/sticks/c4d1-mechanical-chrome.png" },
  { id:"c4d1-metallic-silver",     name:"Metallic Silver",   url:"/sticks/c4d1-metallic-silver.png" },
  { id:"c4d1-silver",              name:"Silver",            url:"/sticks/c4d1-silver.png" },
  { id:"c4d1-wood",                name:"Wood",              url:"/sticks/c4d1-wood.png" },
  { id:"c4d1-wood-grain-metallic", name:"Wood Grain Metal",  url:"/sticks/c4d1-wood-grain-metallic.png" },
  { id:"c4d1-yellow-zig-zag",      name:"Yellow Zig-Zag",    url:"/sticks/c4d1-yellow-zig-zag.png" },
];

const PS_STICKS: StickEntry[] = [
  { id:"c4d-aluminum",            name:"Aluminum",         url:"/sticks/c4d-aluminum.png" },
  { id:"c4d-antique",             name:"Antique",          url:"/sticks/c4d-antique.png" },
  { id:"c4d-apoxy",               name:"Apoxy",            url:"/sticks/c4d-apoxy.png" },
  { id:"c4d-basic-black",         name:"Basic Black",      url:"/sticks/c4d-basic-black.png" },
  { id:"c4d-carbon-fiber",        name:"Carbon Fiber",     url:"/sticks/c4d-carbon-fiber.png" },
  { id:"c4d-chrome",              name:"Chrome",           url:"/sticks/c4d-chrome.png" },
  { id:"c4d-concrete",            name:"Concrete",         url:"/sticks/c4d-concrete.png" },
  { id:"c4d-copper",              name:"Copper",           url:"/sticks/c4d-copper.png" },
  { id:"c4d-glossy-black",        name:"Glossy Black",     url:"/sticks/c4d-glossy-black.png" },
  { id:"c4d-gold",                name:"Gold",             url:"/sticks/c4d-gold.png" },
  { id:"c4d-h-713",               name:"H-713",            url:"/sticks/c4d-h-713.png" },
  { id:"c4d-marble",              name:"Marble",           url:"/sticks/c4d-marble.png" },
  { id:"c4d-opal",                name:"Opal",             url:"/sticks/c4d-opal.png" },
  { id:"c4d-platinum",            name:"Platinum",         url:"/sticks/c4d-platinum.png" },
  { id:"c4d-rainbow-quartz",      name:"Rainbow Quartz",   url:"/sticks/c4d-rainbow-quartz.png" },
  { id:"c4d-rust",                name:"Rust",             url:"/sticks/c4d-rust.png" },
  { id:"c4d-stone",               name:"Stone",            url:"/sticks/c4d-stone.png" },
  { id:"c4d-wood-grain-metallic", name:"Wood Grain Metal", url:"/sticks/c4d-wood-grain-metallic.png" },
];

const STICK_LIB: Record<ControllerType, StickEntry[]> = {
  "xbox-one":  C4D1_STICKS,
  "c4d1-edge": C4D1_STICKS,
  "ps4":       PS_STICKS,
  "ps5":       PS_STICKS,
  "c4d5-edge": PS_STICKS,
};

/** Returns true if the skin value is an animated WebM (base64 data URL or blob URL). */
function isVideoSkin(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith("data:video/") || value.startsWith("blob:");
}

/** Same-style library picker modal as the Bezel Library in ImageEditor. */
function StickLibraryPicker({
  title, entries, current, onSelect, onClose,
}: {
  title: string;
  entries: StickEntry[];
  current: string | null;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center",
        background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"rgba(10,10,14,0.96)", border:"1px solid rgba(255,255,255,0.12)",
        borderRadius:18, padding:"22px 24px",
        boxShadow:"0 24px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)",
        width:340, display:"flex", flexDirection:"column", gap:16,
      }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.08em", color:"#fff", textTransform:"uppercase" }}>
            {title}
          </span>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:20, lineHeight:1 }}>×</button>
        </div>

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, maxHeight:280, overflowY:"auto", paddingRight:4 }}>
          {entries.map(entry => (
            <button key={entry.id} onClick={() => { onSelect(entry.url); onClose(); }}
              style={{
                background: current === entry.url ? "rgba(228,7,7,0.18)" : "rgba(255,255,255,0.05)",
                border:`2px solid ${current === entry.url ? "#e40707" : "rgba(255,255,255,0.10)"}`,
                borderRadius:10, padding:"8px 4px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                transition:"border-color 0.15s, background 0.15s",
              }}>
              <img src={entry.url} alt={entry.name}
                style={{ width:56, height:56, objectFit:"contain" }} />
              <span style={{ fontSize:8, color:"#aaa", textAlign:"center", lineHeight:1.3 }}>{entry.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Simple upload slot for stick skins — includes a ＋ Library button. */
function UploadSlot({ label, value, onUpload, onClear, hint, onOpenLibrary }: UploadSlotProps) {
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
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none">{label}</label>
        {onOpenLibrary && (
          <button onClick={onOpenLibrary}
            className="flex-none flex items-center gap-0.5 text-[10px] text-primary border border-primary/40 hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all font-medium whitespace-nowrap">
            ＋ Library
          </button>
        )}
      </div>
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
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => inputRef.current?.click()}
                className="p-1 rounded-full bg-black/60 text-white hover:bg-primary transition-colors" title="Replace skin">
                <Upload size={11} />
              </button>
              {isVideo && (
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-full bg-black/60 text-violet-300 hover:bg-violet-600 transition-colors" title="Video options">
                    <Settings2 size={11} />
                  </button>
                </PopoverTrigger>
              )}
              <button onClick={() => onChange({ controllerSkin: null })}
                className="p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors" title="Remove skin">
                <X size={11} />
              </button>
            </div>
          </div>

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
                        active ? "bg-violet-600/20 border-violet-500/60 text-violet-300"
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
              <input type="range" min="0.5" max="2" step="0.01" value={config.controllerSkinContrast ?? 1}
                onChange={(e) => onChange({ controllerSkinContrast: parseFloat(e.target.value) })}
                className="w-full h-1 accent-violet-500" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground">Saturation</label>
                <span className="text-[10px] font-mono text-muted-foreground">{(config.controllerSkinSaturate ?? 1).toFixed(2)}×</span>
              </div>
              <input type="range" min="0.5" max="2" step="0.01" value={config.controllerSkinSaturate ?? 1}
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
  const [showLeftLib,  setShowLeftLib]  = useState(false);
  const [showRightLib, setShowRightLib] = useState(false);
  const lib = STICK_LIB[config.controllerType] ?? STICK_LIB["xbox-one"];

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
        onOpenLibrary={() => setShowLeftLib(true)}
      />

      <UploadSlot
        label="Right Thumbstick"
        value={config.rightStickSkin}
        hint="Square PNG, transparent bg"
        onUpload={(url) => onChange({ rightStickSkin: url })}
        onClear={() => onChange({ rightStickSkin: null })}
        onOpenLibrary={() => setShowRightLib(true)}
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

      {/* Left Thumbstick Library Picker */}
      {showLeftLib && (
        <StickLibraryPicker
          title="Left Thumbstick Library"
          entries={lib}
          current={config.leftStickSkin}
          onSelect={(url) => onChange({ leftStickSkin: url })}
          onClose={() => setShowLeftLib(false)}
        />
      )}

      {/* Right Thumbstick Library Picker */}
      {showRightLib && (
        <StickLibraryPicker
          title="Right Thumbstick Library"
          entries={lib}
          current={config.rightStickSkin}
          onSelect={(url) => onChange({ rightStickSkin: url })}
          onClose={() => setShowRightLib(false)}
        />
      )}
    </div>
  );
}
