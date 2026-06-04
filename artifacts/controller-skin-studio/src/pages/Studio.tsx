import { useState } from "react";
import { ControllerPreview } from "../components/ControllerPreview";
import { SkinPanel } from "../components/SkinPanel";
import { ConfigPanel } from "../components/ConfigPanel";
import { ControllerConfig, DEFAULT_CONFIG } from "../types/config";
import { Gamepad2 } from "lucide-react";

export function Studio() {
  const [config, setConfig] = useState<ControllerConfig>(DEFAULT_CONFIG);
  const [showButtonLabels, setShowButtonLabels] = useState(true);

  function handleChange(updates: Partial<ControllerConfig>) {
    setConfig((prev) => ({ ...prev, ...updates }));
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-none border-b border-border bg-card/60 backdrop-blur px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Gamepad2 size={14} className="text-primary" />
          </div>
          <span className="font-bold text-sm tracking-tight">Controller Skin Studio</span>
        </div>
        <span className="text-muted-foreground text-xs border-l border-border pl-3">
          Build controller overlays for OBS &amp; Streamlabs
        </span>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Skins */}
        <aside className="w-64 flex-none border-r border-border bg-card/40 overflow-y-auto p-4">
          <SkinPanel config={config} onChange={handleChange} />
        </aside>

        {/* Center — Preview */}
        <main className="flex-1 flex flex-col overflow-auto bg-background">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-3xl">
              {/* Preview wrapper — checkerboard for transparency */}
              <div
                className="rounded-xl overflow-hidden shadow-2xl border border-border"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#0f0f1a",
                }}
              >
                <ControllerPreview
                  config={config}
                  showButtonLabels={showButtonLabels}
                />
              </div>

              {/* Preview label */}
              <p className="text-center text-[11px] text-muted-foreground mt-3">
                Live preview — connect a gamepad and press buttons to test
              </p>
            </div>
          </div>
        </main>

        {/* Right panel — Config */}
        <aside className="w-64 flex-none border-l border-border bg-card/40 overflow-y-auto p-4">
          <ConfigPanel
            config={config}
            onChange={handleChange}
            showButtonLabels={showButtonLabels}
            onToggleLabels={setShowButtonLabels}
          />
        </aside>
      </div>
    </div>
  );
}
