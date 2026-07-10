import React, { useState, useEffect } from "react";
import { ControllerPreview } from "../components/ControllerPreview";
import { SkinPanel } from "../components/SkinPanel";
import { ConfigPanel } from "../components/ConfigPanel";
import { MkbView, MkbPreset, loadMkbPresets, saveMkbPresets, BASE_KEYS, DEFAULT_MOUSE_MASKS } from "../components/MkbView";
import { ImageEditor, MkbSlot } from "../components/ImageEditor";
import { ControllerConfig, DEFAULT_CONFIG, LayoutOverrides, DEFAULT_OVERRIDES } from "../types/config";
import { LAYOUTS, CONTROLLER_TYPES } from "../lib/layouts";
import { Move, Play, Save, FolderOpen, Trash2, Upload, X, ImageIcon, Loader2, Download, Film, Settings2 } from "lucide-react";
import { useGamepad } from "../hooks/useGamepad";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { LibraryPicker, LibraryEntry } from "../components/LibraryPicker";

const MAX_PRESETS = 5;
interface CtrlPreset { name: string; overrides: LayoutOverrides; savedAt: number; }
function ctrlPresetKey(t: string) { return `css-presets-${t}`; }
function loadCtrlPresets(t: string): CtrlPreset[] { try { return JSON.parse(localStorage.getItem(ctrlPresetKey(t)) ?? "[]"); } catch { return []; } }
function saveCtrlPresets(t: string, p: CtrlPreset[]) { localStorage.setItem(ctrlPresetKey(t), JSON.stringify(p)); }

const CONFIG_KEY = "css-config";
function loadSavedConfig(): ControllerConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    // Remove legacy overlay field that was stored during development
    delete parsed.controllerSkinLogoOverlay;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch { return DEFAULT_CONFIG; }
}
function saveConfig(c: ControllerConfig) {
  try {
    // Blob URLs are session-scoped and can be huge — don't persist them
    const toSave = { ...c };
    if (toSave.controllerSkin?.startsWith("blob:")) delete toSave.controllerSkin;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded — ignore, config just won't persist this session */ }
}

interface MkbSettings {
  kbSkinUrl: string; kbButtonsUrl: string; mouseSkinUrl: string;
  kbSkinVideoFit: "contain" | "cover";
  kbSkinContrast: number; kbSkinSaturate: number;
  mouseSkinVideoFit: "contain" | "cover";
  mouseSkinContrast: number; mouseSkinSaturate: number;
  mkbColor: string; mkbRgbStyle: 1|2|3; mkbRainbow: boolean; mouseColor: string;
  keyPressColor: string;
  keyPressOpacity: number;
  keyPressGlow: number;
  kbOpacity: number; kbGlow: number;
  mouseOpacity: number; mouseGlow: number; mouseInnerFade: boolean; mouseOuterFade: boolean;
  mouseRgbEnabled: boolean; mouseRgbMode: "wave"|"breathing"; mouseRgbSpeed: number;
  mouseRgbIntensity: number; mouseRgbColor: string; mouseRgbRainbow: boolean;
  mkbShowShadow: boolean; mkbShadowIntensity: number; mkbShadowAngle: number;
  mkbWidth: number; mkbHeight: number;
}
const DEFAULT_MKB_SETTINGS: MkbSettings = {
  kbSkinUrl: "mkb/keyboard-empty.png", kbButtonsUrl: "mkb/keyboard-buttons.png", mouseSkinUrl: "mkb/mouse.png",
  kbSkinVideoFit: "contain", kbSkinContrast: 1, kbSkinSaturate: 1,
  mouseSkinVideoFit: "contain", mouseSkinContrast: 1, mouseSkinSaturate: 1,
  mkbColor: "#ffffff", mkbRgbStyle: 1, mkbRainbow: false, mouseColor: "#ffffff",
  keyPressColor: "#ffffff",
  keyPressOpacity: 1,
  keyPressGlow: 8,
  kbOpacity: 0.85, kbGlow: 8,
  mouseOpacity: 1.0, mouseGlow: 6, mouseInnerFade: false, mouseOuterFade: false,
  mouseRgbEnabled: false, mouseRgbMode: "wave", mouseRgbSpeed: 6,
  mouseRgbIntensity: 1, mouseRgbColor: "#e40707", mouseRgbRainbow: true,
  mkbShowShadow: false, mkbShadowIntensity: 0.8, mkbShadowAngle: 180,
  mkbWidth: 1920, mkbHeight: 1080,
};
const MKB_SETTINGS_KEY = "css-mkb-settings";
function loadMkbSettings(): MkbSettings {
  try {
    const raw = localStorage.getItem(MKB_SETTINGS_KEY);
    if (!raw) return DEFAULT_MKB_SETTINGS;
    const parsed = JSON.parse(raw);
    // Spread defaults first so any new fields added to DEFAULT_MKB_SETTINGS
    // are always present even if the saved JSON predates them.
    // Then override with saved values, but always reset built-in skin paths.
    return {
      ...DEFAULT_MKB_SETTINGS,
      ...parsed,
      kbSkinUrl: DEFAULT_MKB_SETTINGS.kbSkinUrl,
      kbButtonsUrl: DEFAULT_MKB_SETTINGS.kbButtonsUrl,
      mouseSkinUrl: DEFAULT_MKB_SETTINGS.mouseSkinUrl,
      // Explicit fallbacks for fields that may be missing in old saved data
      mkbShowShadow: parsed.mkbShowShadow ?? DEFAULT_MKB_SETTINGS.mkbShowShadow,
      mkbShadowIntensity: parsed.mkbShadowIntensity ?? DEFAULT_MKB_SETTINGS.mkbShadowIntensity,
      mkbShadowAngle: parsed.mkbShadowAngle ?? DEFAULT_MKB_SETTINGS.mkbShadowAngle,
      keyPressOpacity: parsed.keyPressOpacity ?? DEFAULT_MKB_SETTINGS.keyPressOpacity,
      keyPressGlow: parsed.keyPressGlow ?? DEFAULT_MKB_SETTINGS.keyPressGlow,
    };
  } catch { return DEFAULT_MKB_SETTINGS; }
}
function saveMkbSettings(s: MkbSettings) {
  try {
    // Skin URLs are uploaded as base64 data URLs (can be several MB) and loadMkbSettings()
    // always resets them to the default paths on load anyway — so there's no point persisting
    // them, and doing so risks blowing the localStorage quota on every upload.
    const { kbSkinUrl, kbButtonsUrl, mouseSkinUrl, ...toSave } = s;
    localStorage.setItem(MKB_SETTINGS_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded — ignore, settings just won't persist this session */ }
}

export function Studio() {
  const [config, setConfig] = useState<ControllerConfig>(loadSavedConfig);
  // Ref always holds the latest config value — used in callbacks that may close over stale state
  const configRef = React.useRef(config);
  configRef.current = config;
  const [overrides, setOverrides] = useState<LayoutOverrides>(() => {
    const initial = loadSavedConfig();
    const presets = loadCtrlPresets(initial.controllerType);
    return presets[0]?.overrides ?? DEFAULT_OVERRIDES;
  });
  const [showButtonLabels, setShowButtonLabels] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [mkbMode, setMkbMode] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [mkbEditMode, setMkbEditMode] = useState(false);

  // Images exported from the Editor tab for controllers other than the
  // currently-active one; applied automatically when that controller is opened.
  const [pendingSkins, setPendingSkins] = useState<Partial<Record<string, Partial<Pick<ControllerConfig, "controllerSkin" | "leftStickSkin" | "rightStickSkin" | "homeButtonZone">>>>>({});

  // MKB skins
  const [mkbSettingsInit] = useState(loadMkbSettings);
  const [kbSkinUrl, setKbSkinUrl] = useState(mkbSettingsInit.kbSkinUrl);
  const [kbButtonsUrl, setKbButtonsUrl] = useState(mkbSettingsInit.kbButtonsUrl);
  const [mouseSkinUrl, setMouseSkinUrl] = useState(mkbSettingsInit.mouseSkinUrl);
  const [kbSkinVideoFit, setKbSkinVideoFit] = useState<"contain"|"cover">(mkbSettingsInit.kbSkinVideoFit ?? "contain");
  const [kbSkinContrast, setKbSkinContrast] = useState(mkbSettingsInit.kbSkinContrast ?? 1);
  const [kbSkinSaturate, setKbSkinSaturate] = useState(mkbSettingsInit.kbSkinSaturate ?? 1);
  const [mouseSkinVideoFit, setMouseSkinVideoFit] = useState<"contain"|"cover">(mkbSettingsInit.mouseSkinVideoFit ?? "contain");
  const [mouseSkinContrast, setMouseSkinContrast] = useState(mkbSettingsInit.mouseSkinContrast ?? 1);
  const [mouseSkinSaturate, setMouseSkinSaturate] = useState(mkbSettingsInit.mouseSkinSaturate ?? 1);

  // MKB appearance
  const [mkbColor, setMkbColor] = useState(mkbSettingsInit.mkbColor);
  const [keyPressColor, setKeyPressColor] = useState(mkbSettingsInit.keyPressColor);
  const [keyPressOpacity, setKeyPressOpacity] = useState(mkbSettingsInit.keyPressOpacity);
  const [keyPressGlow, setKeyPressGlow] = useState(mkbSettingsInit.keyPressGlow);
  const [mkbRgbStyle, setMkbRgbStyle] = useState<1|2|3>(mkbSettingsInit.mkbRgbStyle);
  const [mkbRainbow, setMkbRainbow] = useState(mkbSettingsInit.mkbRainbow);
  const [kbRgbVisible, setKbRgbVisible] = useState(true);
  const [mouseColor, setMouseColor] = useState(mkbSettingsInit.mouseColor);
  // Keyboard appearance
  const [kbOpacity, setKbOpacity] = useState(mkbSettingsInit.kbOpacity);
  const [kbGlow, setKbGlow] = useState(mkbSettingsInit.kbGlow);
  // Mouse appearance
  const [mouseOpacity, setMouseOpacity] = useState(mkbSettingsInit.mouseOpacity);
  const [mouseGlow, setMouseGlow] = useState(mkbSettingsInit.mouseGlow);
  const [mouseInnerFade, setMouseInnerFade] = useState(mkbSettingsInit.mouseInnerFade);
  const [mouseOuterFade, setMouseOuterFade] = useState(mkbSettingsInit.mouseOuterFade);
  const [mouseRgbEnabled, setMouseRgbEnabled] = useState(mkbSettingsInit.mouseRgbEnabled);
  const [mouseRgbMode, setMouseRgbMode] = useState<"wave"|"breathing">(mkbSettingsInit.mouseRgbMode);
  const [mouseRgbSpeed, setMouseRgbSpeed] = useState(mkbSettingsInit.mouseRgbSpeed);
  const [mouseRgbIntensity, setMouseRgbIntensity] = useState(mkbSettingsInit.mouseRgbIntensity);
  const [mouseRgbColor, setMouseRgbColor] = useState(mkbSettingsInit.mouseRgbColor);
  const [mouseRgbRainbow, setMouseRgbRainbow] = useState(mkbSettingsInit.mouseRgbRainbow);
  const [mkbShowShadow, setMkbShowShadow] = useState(mkbSettingsInit.mkbShowShadow);
  const [mkbShadowIntensity, setMkbShadowIntensity] = useState(mkbSettingsInit.mkbShadowIntensity);
  const [mkbShadowAngle, setMkbShadowAngle] = useState(mkbSettingsInit.mkbShadowAngle);
  const [mkbWidth, setMkbWidth] = useState(mkbSettingsInit.mkbWidth);
  const [mkbHeight, setMkbHeight] = useState(mkbSettingsInit.mkbHeight);

  // Controller presets
  const [ctrlPresets, setCtrlPresets] = useState<CtrlPreset[]>([]);
  // MKB presets
  const [mkbPresets, setMkbPresets] = useState<MkbPreset[]>(() => loadMkbPresets());
  // Shared preset UI
  const [showPresets, setShowPresets] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveInput, setSaveInput] = useState("");

  // MKB key/mask overrides lifted up from MkbView so header save can access them
  const [keyOverrides, setKeyOverrides] = useState<Record<string,{cx:number;cy:number;w:number;h:number}>>(() => {
    const presets = loadMkbPresets();
    return presets[0]?.keyOverrides ?? {};
  });
  const [mouseOverrides, setMouseOverrides] = useState<{id:string;cx:number;cy:number;w:number;h:number}[]>(() => {
    const presets = loadMkbPresets();
    return presets[0]?.mouseOverrides ?? [];
  });
  // Refs so export always reads latest values regardless of closure staleness
  const keyOverridesRef = React.useRef<Record<string,{cx:number;cy:number;w:number;h:number}>>({});
  const mouseOverridesRef = React.useRef<{id:string;cx:number;cy:number;w:number;h:number}[]>([]);
  const getMasksRef = React.useRef<()=>{id:string;cx:number;cy:number;w:number;h:number}[]>(()=>[]);
  // Keep refs in sync
  React.useEffect(()=>{ mouseOverridesRef.current = mouseOverrides; },[mouseOverrides]);
  React.useEffect(()=>{ keyOverridesRef.current = keyOverrides; },[keyOverrides]);

  const gp = useGamepad();
  const baseLayout = LAYOUTS[config.controllerType] ?? LAYOUTS["xbox-one"];
  const ltLabel = config.controllerType === "xbox-one" ? "LT" : "L2";
  const rtLabel = config.controllerType === "xbox-one" ? "RT" : "R2";
  const lStickBase = baseLayout.sticks[0];
  const lStickEff = { ...lStickBase, ...(overrides.sticks[0] ?? {}) };
  const stickSizePx = Math.round(config.width * lStickEff.size / 100);
  const bodyW = config.width;
  const bodyH = Math.round(config.width * baseLayout.skinHeight / baseLayout.skinWidth);
  const bodySizeLabel = `${bodyW} × ${bodyH} px`;

  useEffect(() => {
    // Debounced — saveConfig JSON.stringifies the whole config (which can carry
    // multi-MB base64 skin images/videos) and writes it to localStorage
    // synchronously. Rapid-fire updates (e.g. dragging inside a native color
    // picker, which fires onChange continuously) were re-running that heavy
    // write on every single tick, blocking the main thread and making the
    // picker visibly lag behind the cursor.
    const t = setTimeout(() => saveConfig(config), 400);
    return () => clearTimeout(t);
  }, [config]);

  useEffect(() => {
    saveMkbSettings({
      kbSkinUrl, kbButtonsUrl, mouseSkinUrl,
      kbSkinVideoFit, kbSkinContrast, kbSkinSaturate,
      mouseSkinVideoFit, mouseSkinContrast, mouseSkinSaturate,
      mkbColor, mkbRgbStyle, mkbRainbow, mouseColor,
      keyPressColor, keyPressOpacity, keyPressGlow,
      kbOpacity, kbGlow,
      mouseOpacity, mouseGlow, mouseInnerFade, mouseOuterFade,
      mouseRgbEnabled, mouseRgbMode, mouseRgbSpeed, mouseRgbIntensity, mouseRgbColor, mouseRgbRainbow,
      mkbShowShadow, mkbShadowIntensity, mkbShadowAngle,
      mkbWidth, mkbHeight,
    });
  }, [kbSkinUrl, kbButtonsUrl, mouseSkinUrl,
      kbSkinVideoFit, kbSkinContrast, kbSkinSaturate,
      mouseSkinVideoFit, mouseSkinContrast, mouseSkinSaturate,
      mkbColor, mkbRgbStyle, mkbRainbow, mouseColor,
      keyPressColor, keyPressOpacity, keyPressGlow,
      kbOpacity, kbGlow, mouseOpacity, mouseGlow, mouseInnerFade, mouseOuterFade,
      mouseRgbEnabled, mouseRgbMode, mouseRgbSpeed, mouseRgbIntensity, mouseRgbColor, mouseRgbRainbow,
      mkbShowShadow, mkbShadowIntensity, mkbShadowAngle,
      mkbWidth, mkbHeight]);

  useEffect(() => {
    const presets = loadCtrlPresets(config.controllerType);
    setCtrlPresets(presets);
    setShowPresets(false); setShowSaveInput(false);
  }, [config.controllerType]);

  useEffect(() => {
    setShowPresets(false); setShowSaveInput(false);
  }, [mkbMode]);

  function handleChange(u: Partial<ControllerConfig>) { setConfig(p => ({ ...p, ...u })); }
  function handleResetOverrides() { setOverrides(DEFAULT_OVERRIDES); setEditMode(false); }
  function switchController(ctId: string) {
    const l = LAYOUTS[ctId];
    const pending = pendingSkins[ctId];
    handleChange({
      controllerType: ctId,
      controllerSkin: pending?.controllerSkin ?? l.defaultSkinUrl,
      leftStickSkin: pending?.leftStickSkin ?? l.defaultLeftStickUrl,
      rightStickSkin: pending?.rightStickSkin ?? l.defaultRightStickUrl,
      // A layout's default skin has no home button placed on it — only a
      // pending custom bake carries protected-zone data.
      homeButtonZone: pending?.homeButtonZone ?? null,
    });
    if (pending) {
      setPendingSkins(prev => {
        const { [ctId]: _, ...rest } = prev;
        return rest;
      });
    }
    const presets = loadCtrlPresets(ctId);
    setOverrides(presets[0]?.overrides ?? DEFAULT_OVERRIDES);
    setEditMode(false);
    setMkbMode(false);
  }

  // Called from the Editor tab's "Export to Skin Slot" — applies the edited
  // image to the chosen skin slot for the target controller, without leaving the editor.
  // If exporting to the currently-active controller, applies immediately via handleChange.
  // Otherwise stores it in pendingSkins so it's applied when that controller is next opened.
  function handleExportFromEditor(dataUrl: string, slot: "controllerSkin" | "leftStickSkin" | "rightStickSkin", controllerType: string, homeButtonZone: ControllerConfig["homeButtonZone"]) {
    // Use configRef.current (not the closed-over `config`) so this always reads
    // the live controllerType even if called from an async callback or stale closure.
    if (controllerType === configRef.current.controllerType) {
      handleChange({ [slot]: dataUrl, ...(slot === "controllerSkin" ? { homeButtonZone } : {}) });
    } else {
      setPendingSkins(prev => ({
        ...prev,
        [controllerType]: {
          ...(prev[controllerType] ?? {}),
          [slot]: dataUrl,
          ...(slot === "controllerSkin" ? { homeButtonZone } : {}),
        },
      }));
    }
  }

  // Resets a skin slot back to the layout default — called from the editor's X button.
  function handleClearSlot(slot: "controllerSkin" | "leftStickSkin" | "rightStickSkin", controllerType: string) {
    const l = LAYOUTS[controllerType];
    if (!l) return;
    const defaults = {
      controllerSkin:   l.defaultSkinUrl,
      leftStickSkin:    l.defaultLeftStickUrl,
      rightStickSkin:   l.defaultRightStickUrl,
    };
    if (controllerType === configRef.current.controllerType) {
      // Resetting the controller body back to the layout default also clears
      // the protected zone — the default skin has no home button on it.
      handleChange({ [slot]: defaults[slot], ...(slot === "controllerSkin" ? { homeButtonZone: null } : {}) });
    } else {
      setPendingSkins(prev => {
        const existing = { ...(prev[controllerType] ?? {}) };
        delete existing[slot];
        if (slot === "controllerSkin") delete existing.homeButtonZone;
        return Object.keys(existing).length > 0
          ? { ...prev, [controllerType]: existing }
          : (({ [controllerType]: _, ...rest }) => rest)(prev);
      });
    }
  }

  // Push an edited image/WebM from the editor into the MKB skin slots.
  function handleExportMkbSkin(dataUrl: string, slot: MkbSlot) {
    if (slot === "kbSkin")        setKbSkinUrl(dataUrl);
    else if (slot === "mouseSkin")      setMouseSkinUrl(dataUrl);
    else if (slot === "kbButtonsSkin")  setKbButtonsUrl(dataUrl);
  }

  // Reset an MKB slot back to its default template asset.
  function handleClearMkbSlot(slot: MkbSlot) {
    if (slot === "kbSkin")        setKbSkinUrl(DEFAULT_MKB_SETTINGS.kbSkinUrl);
    else if (slot === "mouseSkin")      setMouseSkinUrl(DEFAULT_MKB_SETTINGS.mouseSkinUrl);
    else if (slot === "kbButtonsSkin")  setKbButtonsUrl(DEFAULT_MKB_SETTINGS.kbButtonsUrl);
  }

  // Listen for video loop preference from ImageEditor
  useEffect(() => {
    const handler = (e: Event) => {
      const { loop } = (e as CustomEvent).detail;
      handleChange({ controllerSkinLoop: loop });
    };
    window.addEventListener("bezel-video-loop", handler);
    return () => window.removeEventListener("bezel-video-loop", handler);
  }, []);

  // Save — controller or MKB depending on current mode
  function handleSave() {
    const name = saveInput.trim();
    if (mkbMode) {
      const n = name || `MKB Preset ${mkbPresets.length + 1}`;
      const updated = [{ name: n, keyOverrides, mouseOverrides, savedAt: Date.now() }, ...mkbPresets].slice(0, MAX_PRESETS);
      setMkbPresets(updated); saveMkbPresets(updated);
    } else {
      const n = name || `Preset ${ctrlPresets.length + 1}`;
      const updated = [{ name: n, overrides, savedAt: Date.now() }, ...ctrlPresets].slice(0, MAX_PRESETS);
      setCtrlPresets(updated); saveCtrlPresets(config.controllerType, updated);
    }
    setSaveInput(""); setShowSaveInput(false); setShowPresets(true);
  }

  const presets = mkbMode ? mkbPresets : ctrlPresets;

  // MKB export state and function — lives in Studio so it has access to all state refs
  const [mkbExporting, setMkbExporting] = React.useState(false);

  const handleExportMkb = React.useCallback(async () => {
    setMkbExporting(true);
    try {
      const toB64 = async (url: string): Promise<string> => {
        if (!url) return "";
        try {
          // fetch() resolves relative URLs against the current document on
          // its own; manually prepending window.location.origin breaks under
          // Electron's file:// protocol (origin serializes as the literal
          // string "file://" with no path).
          const resolvedUrl = url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')
            ? url
            : url.startsWith('/') ? url.slice(1) : url;
          const res = await fetch(resolvedUrl);
          const blob = await res.blob();
          return new Promise(resolve => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(blob);
          });
        } catch { return ""; }
      };

      const [kbB64, keysB64, mouseB64, maskB64] = await Promise.all([
        toB64(kbSkinUrl), toB64(kbButtonsUrl), toB64(mouseSkinUrl), toB64("mkb/rgb-mask.png"),
      ]);

      // Build effective key positions (with overrides)
      const effectiveKeys = BASE_KEYS.map(k => {
        const ov = keyOverridesRef.current[k.code];
        return { code: k.code, cx: ov?.cx ?? k.cx, cy: ov?.cy ?? k.cy, w: ov?.w ?? k.w, h: ov?.h ?? k.h };
      });

      // Build effective mouse masks (with overrides)
      const maskAspectRatios: Record<string,number> = {left:2.488,right:2.521,scroll:2.0,side_top:3.688,side_bot:2.109};
      const liveMasks = getMasksRef.current();
      const sourceMasks = liveMasks.length > 0 ? liveMasks : mouseOverridesRef.current;
      const effectiveMasks = DEFAULT_MOUSE_MASKS.map(m => {
        const ov = sourceMasks.find(o => o.id === m.id);
        const w = ov?.w ?? m.w;
        const h = ov?.h ?? (w * (maskAspectRatios[m.id] ?? 1));
        return { id: m.id, src: m.src, btnIndex: m.btnIndex, cx: ov?.cx ?? m.cx, cy: ov?.cy ?? m.cy, w, h };
      });

      // Fetch all mouse mask images
      const maskImages: Record<string, string> = {};
      await Promise.all(effectiveMasks.map(async m => {
        maskImages[m.id] = await toB64(m.src);
      }));

      const kbW = Math.round(mkbWidth * 0.66);
      const kbH = Math.round(kbW * 799 / 1344);
      const mouseW = Math.round(mkbWidth * 0.30);
      const mouseH = Math.round(mouseW * 1.27);
      const rc = parseInt(mkbColor.slice(1,3)||"ff",16);
      const gc = parseInt(mkbColor.slice(3,5)||"ff",16);
      const bcv = parseInt(mkbColor.slice(5,7)||"ff",16);
      const mrc = parseInt(mouseColor.slice(1,3)||"ff",16);
      const mgc = parseInt(mouseColor.slice(3,5)||"ff",16);
      const mbc = parseInt(mouseColor.slice(5,7)||"ff",16);
      const kpc = parseInt(keyPressColor.slice(1,3)||"ff",16);
      const kpg = parseInt(keyPressColor.slice(3,5)||"ff",16);
      const kpb = parseInt(keyPressColor.slice(5,7)||"ff",16);
      const mrgbc = parseInt(mouseRgbColor.slice(1,3)||"ff",16);
      const mrgbg = parseInt(mouseRgbColor.slice(3,5)||"ff",16);
      const mrgbb = parseInt(mouseRgbColor.slice(5,7)||"ff",16);

      const keysJson = JSON.stringify(effectiveKeys);
      const masksJson = JSON.stringify(effectiveMasks.map(m => ({...m, b64: maskImages[m.id]})));

      // Drop shadow — mirrors the filter formula applied to `.kb`/mouse wrap in the live MkbView preview
      const mkbShadowFilter = mkbShowShadow ? (() => {
        const rad = (mkbShadowAngle * Math.PI) / 180;
        const sx = Math.round(Math.sin(rad) * 12 * mkbShadowIntensity);
        const sy = Math.round(Math.cos(rad) * 12 * mkbShadowIntensity);
        const a = mkbShadowIntensity;
        return `drop-shadow(${sx}px ${sy}px 24px rgba(0,0,0,${a})) drop-shadow(${Math.round(sx*0.4)}px ${Math.round(sy*0.4)}px 8px rgba(0,0,0,${Math.min(a+0.1,1)}))`;
      })() : "none";

      // Contrast/saturate color correction — mirrors MkbView's per-skin CSS filter
      const kbSkinFilter = [kbSkinContrast !== 1 ? `contrast(${kbSkinContrast})` : "", kbSkinSaturate !== 1 ? `saturate(${kbSkinSaturate})` : ""].filter(Boolean).join(" ");
      const mouseSkinFilter = [mouseSkinContrast !== 1 ? `contrast(${mouseSkinContrast})` : "", mouseSkinSaturate !== 1 ? `saturate(${mouseSkinSaturate})` : ""].filter(Boolean).join(" ");

      // Video skins (WebM/MP4) come back from toB64() as `data:video/...` data URLs
      // (same detection rule as isVideoSkin() in MkbView.tsx/SkinPanel.tsx). Filters
      // are kept off the <video> element itself — applied to a wrapping div instead —
      // to avoid disabling hardware video decode in some Chromium builds (OBS's CEF
      // browser source included).
      const isVid = (b64: string) => b64.startsWith("data:video/");
      const kbIsVideo = isVid(kbB64);
      const keysIsVideo = isVid(keysB64);
      const mouseIsVideo = isVid(mouseB64);
      const kbSkinTag = kbB64
        ? `<div style="position:absolute;inset:0;width:100%;height:100%;z-index:1;${kbSkinFilter ? `filter:${kbSkinFilter}` : ""}">${
            kbIsVideo
              ? `<video src="${kbB64}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:${kbSkinVideoFit};background:transparent"></video>`
              : `<img src="${kbB64}" style="width:100%;height:100%;object-fit:cover">`
          }</div>`
        : "";
      const keysTag = keysB64
        ? (keysIsVideo
            ? `<video id="kbkeys" src="${keysB64}" autoplay loop muted playsinline style="z-index:3;object-fit:cover;background:transparent"></video>`
            : `<img id="kbkeys" src="${keysB64}" style="z-index:3">`)
        : "";
      const mouseSkinTag = mouseB64
        ? `<div style="position:absolute;inset:0;width:100%;height:100%;${mouseSkinFilter ? `filter:${mouseSkinFilter}` : ""}">${
            mouseIsVideo
              ? `<video src="${mouseB64}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:${mouseSkinVideoFit};background:transparent"></video>`
              : `<img class="mskin" src="${mouseB64}" style="width:100%;height:100%;object-fit:contain;display:block">`
          }</div>`
        : "";

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${mkbWidth}px;height:${mkbHeight}px;overflow:hidden;background:transparent}
body{display:flex;align-items:center;justify-content:center;gap:24px}
.kb{position:relative;width:${kbW}px;height:${kbH}px;flex-shrink:0}
.kb>*{position:absolute;top:0;left:0;width:100%;height:100%}
.kb img{object-fit:cover}
#kbkeys{pointer-events:none}
.mouse-wrap{width:${mouseW}px;height:${mouseH}px;flex-shrink:0;position:relative;overflow:visible}
.mouse-wrap img.mskin{width:100%;height:100%;object-fit:contain;display:block;position:relative}
.mouse-wrap canvas#mouseRgbCv{position:absolute;inset:0;width:100%;height:100%;display:block}
.mmask{position:absolute;object-fit:contain;opacity:0;transition:opacity 0.06s;pointer-events:none}
#wsStatus{position:fixed;top:4px;left:4px;background:#000;color:#0f0;font-family:monospace;font-size:8px;padding:2px 5px;border-radius:3px;border:1px solid #0f0;z-index:9999;opacity:0.35}
</style>
</head>
<body>
<div id="wsStatus">WS: connecting...</div>
<div class="kb" style="filter:${mkbShadowFilter}">
  ${kbSkinTag}
  <canvas id="rgbcv" style="z-index:2"></canvas>
  ${keysTag}
  <canvas id="keyglow" style="z-index:4"></canvas>
</div>
<div class="mouse-wrap" id="mousewrap" style="filter:${mkbShadowFilter}">
  ${mouseIsVideo ? "" : `<canvas id="mouseRgbCv"></canvas>`}
  ${mouseSkinTag}
</div>
<script>
(function(){
  // ── Config (live-updatable via WebSocket from C4D Companion) ──
  var KB_W=${kbW}, KB_H=${kbH};
  var MOUSE_W=${mouseW}, MOUSE_H=${mouseH};
  var RC=${rc},GC=${gc},BC=${bcv};
  var MRC=${mrc},MGC=${mgc},MBC=${mbc};
  var RAINBOW=${mkbRainbow};
  var STYLE=${mkbRgbStyle};
  var KB_OPACITY=${kbOpacity};
  var KB_GLOW=${kbGlow};
  var MOUSE_GLOW=${mouseGlow};
  var MOUSE_OPACITY=${mouseOpacity};
  var MOUSE_INNER_FADE=${mouseInnerFade ? "true" : "false"};
  var MOUSE_OUTER_FADE=${mouseOuterFade ? "true" : "false"};
  var KPC=${kpc},KPG=${kpg},KPB=${kpb};
  var KEY_PRESS_OPACITY=${keyPressOpacity};
  var KEY_PRESS_GLOW=${keyPressGlow};
  var MOUSE_RGB_ENABLED=${mouseRgbEnabled ? "true" : "false"};
  var MOUSE_RGB_MODE='${mouseRgbMode}';
  var MOUSE_RGB_SPEED=${mouseRgbSpeed};
  var MOUSE_RGB_INTENSITY=${mouseRgbIntensity};
  var MOUSE_RGB_RAINBOW=${mouseRgbRainbow ? "true" : "false"};
  var MRGBC=${mrgbc},MRGBG=${mrgbg},MRGBB=${mrgbb};

  // ── Key definitions ──
  var KEYS = ${keysJson};
  var MASKS = ${masksJson};

  // ── uiohook keycode -> our KEYS[].code map ──
  var KEY_MAP = {
    1:'Escape',2:'Digit1',3:'Digit2',4:'Digit3',5:'Digit4',6:'Digit5',
    7:'Digit6',8:'Digit7',9:'Digit8',10:'Digit9',11:'Digit0',
    15:'Tab',58:'CapsLock',
    30:'KeyA',48:'KeyB',46:'KeyC',32:'KeyD',18:'KeyE',33:'KeyF',34:'KeyG',
    35:'KeyH',23:'KeyI',36:'KeyJ',37:'KeyK',38:'KeyL',50:'KeyM',
    49:'KeyN',24:'KeyO',25:'KeyP',16:'KeyQ',19:'KeyR',31:'KeyS',
    20:'KeyT',22:'KeyU',47:'KeyV',17:'KeyW',45:'KeyX',21:'KeyY',44:'KeyZ',
    42:'ShiftLeft',54:'ShiftRight',29:'ControlLeft',157:'ControlRight',
    56:'AltLeft',184:'AltRight',57:'Space'
  };

  // ── RGB Canvas ──
  var cv = document.getElementById('rgbcv');
  cv.width = KB_W; cv.height = KB_H;
  var ctx = cv.getContext('2d');
  cv.style.opacity = KB_OPACITY;

  var maskImg = new Image();
  maskImg.src = "${maskB64}";

  var t = 0;
  function getC(h,a){
    if(RAINBOW){ var hue=((h*360)%360+360)%360; return 'hsla('+hue+',100%,55%,'+a+')'; }
    return 'rgba('+RC+','+GC+','+BC+','+a+')';
  }

  // ── Key glow canvas ──
  var kg = document.getElementById('keyglow');
  kg.width = KB_W; kg.height = KB_H;
  var kctx = kg.getContext('2d');

  // ── Pressed key tracking ──
  var pressedKeys = {};
  var ripples = [];

  function handleKeyDown(code){
    if(pressedKeys[code]) return;
    pressedKeys[code] = true;
    if(code==='Digit6') STYLE=1;
    if(code==='Digit7') STYLE=2;
    if(code==='Digit8') STYLE=3;
    var k = KEYS.find(function(k){ return k.code===code; });
    if(k) ripples.push({cx:k.cx/100*KB_W, cy:k.cy/100*KB_H, t:t});
  }
  function handleKeyUp(code){ delete pressedKeys[code]; }

  // ── Mouse tracking ──
  var mouseX=0, mouseY=0, targetX=0, targetY=0;
  var RADIUS=50;
  var mouseButtons = {};

  function handleMouseMove(dx,dy){
    targetX = Math.max(-RADIUS, Math.min(RADIUS, targetX + dx*0.5));
    targetY = Math.max(-RADIUS, Math.min(RADIUS, targetY + dy*0.5));
  }

  // ── Build mouse mask elements ──
  var wrap = document.getElementById('mousewrap');
  var maskEls = {};
  MASKS.forEach(function(m){
    var img = document.createElement('img');
    img.src = m.b64;
    img.className = 'mmask';
    img.style.left = (m.cx - m.w/2) + '%';
    img.style.top = (m.cy - m.h/2) + '%';
    img.style.width = m.w + '%';
    img.style.height = m.h + '%';
    wrap.appendChild(img);
    maskEls[m.id] = {el:img, btnIndex:m.btnIndex};
  });

  function updateMouseMasks(){
    Object.keys(maskEls).forEach(function(id){
      var m = maskEls[id];
      var pressed = mouseButtons[m.btnIndex];
      m.el.style.opacity = pressed ? MOUSE_OPACITY : 0;
      var mouseCol = 'rgba('+MRC+','+MGC+','+MBC+',0.9)';
      m.el.style.filter = pressed
        ? 'drop-shadow(0 0 '+MOUSE_GLOW+'px '+mouseCol+')'
          + (MOUSE_OUTER_FADE ? ' drop-shadow(0 0 '+(MOUSE_GLOW*2)+'px '+mouseCol+')' : '')
          + (MOUSE_INNER_FADE ? ' brightness(1.3)' : '')
        : 'none';
    });
  }

  // ══ WebSocket connection to C4D Companion ══
  // uiohook mouse button numbers: 1=left, 2=right, 3=middle/scroll, 4=side_top, 5=side_bot
  var WS_BTN_MAP = { 1:0, 2:2, 3:1, 4:3, 5:4 };
  var ws, msgCount=0;
  function connectWS(){
    ws = new WebSocket('ws://127.0.0.1:8080');
    var statusEl = document.getElementById('wsStatus');

    ws.onopen = function(){
      if(statusEl){ statusEl.textContent='WS: connected'; statusEl.style.borderColor='#0f0'; statusEl.style.color='#0f0'; }
    };
    ws.onclose = function(){
      if(statusEl){ statusEl.textContent='WS: disconnected - retrying'; statusEl.style.borderColor='#f00'; statusEl.style.color='#f00'; }
      setTimeout(connectWS, 2000);
    };
    ws.onerror = function(){ ws.close(); };

    ws.onmessage = function(e){
      msgCount++;
      var msg = JSON.parse(e.data);
      if(statusEl) statusEl.textContent = 'WS: '+msgCount+' | '+msg.type;

      if(msg.type==='config'){
        if(msg.kbColor){ var c=msg.kbColor; RC=parseInt(c.slice(1,3),16);GC=parseInt(c.slice(3,5),16);BC=parseInt(c.slice(5,7),16); }
        if(msg.mouseColor){ var mc=msg.mouseColor; MRC=parseInt(mc.slice(1,3),16);MGC=parseInt(mc.slice(3,5),16);MBC=parseInt(mc.slice(5,7),16); }
        if(msg.rgbStyle) STYLE=msg.rgbStyle;
        if(msg.opacity!=null) KB_OPACITY=msg.opacity;
        if(msg.mouseGlow!=null) MOUSE_GLOW=msg.mouseGlow;
        cv.style.opacity = KB_OPACITY;
        return;
      }
      if(msg.type==='keydown'){ handleKeyDown(KEY_MAP[msg.code] || ('key'+msg.code)); return; }
      if(msg.type==='keyup'){ handleKeyUp(KEY_MAP[msg.code] || ('key'+msg.code)); return; }
      if(msg.type==='mousemove'){ handleMouseMove(msg.dx, msg.dy); return; }
      if(msg.type==='mousedown'){
        var idx = WS_BTN_MAP[msg.button];
        if(idx!=null){ mouseButtons[idx]=true; updateMouseMasks(); }
        return;
      }
      if(msg.type==='mouseup'){
        var idx2 = WS_BTN_MAP[msg.button];
        if(idx2!=null){ delete mouseButtons[idx2]; updateMouseMasks(); }
        return;
      }
    };
  }
  connectWS();

  // ── Mouse ambient RGB (masked to the mouse skin's own silhouette) ──
  if(MOUSE_RGB_ENABLED){
    (function(){
      var mrCanvas = document.getElementById('mouseRgbCv');
      var mrWrap = document.getElementById('mousewrap');
      if(!mrCanvas || !mrWrap) return;
      var mrCtx = mrCanvas.getContext('2d');
      var mrMaskImg = new Image();
      mrMaskImg.src = "${mouseB64}";
      var mrT = 0;
      var mrSS = 1 / Math.max(MOUSE_RGB_SPEED, 0.5);
      var mrStarted = false;

      function mrGetC(hue, alpha){
        if(MOUSE_RGB_RAINBOW){
          var h = ((hue*360)%360+360)%360;
          return 'hsla('+h+',100%,55%,'+alpha+')';
        }
        return 'rgba('+MRGBC+','+MRGBG+','+MRGBB+','+alpha+')';
      }

      var mrRo = new ResizeObserver(function(entries){
        var e = entries[0];
        mrCanvas.width = e.contentRect.width;
        mrCanvas.height = e.contentRect.height;
        if(!mrStarted && mrCanvas.width > 0 && mrCanvas.height > 0){
          mrStarted = true;
          mrTick();
        }
      });
      mrRo.observe(mrWrap);

      function mrTick(){
        mrT += 0.016 * mrSS;
        var w = mrCanvas.width, h = mrCanvas.height;
        if(w > 0 && h > 0){
          mrCtx.clearRect(0,0,w,h);
          if(MOUSE_RGB_MODE === 'breathing'){
            var raw = 0.5 + 0.5*Math.sin(mrT*2.5);
            var pulse = 0.3 + 0.7*raw;
            var hue = MOUSE_RGB_RAINBOW ? mrT*0.08 : 0;
            mrCtx.fillStyle = mrGetC(hue, MOUSE_RGB_INTENSITY * pulse);
            mrCtx.fillRect(0,0,w,h);
          } else {
            var pulseRaw = 0.5 + 0.5*Math.sin(mrT*3);
            var pulse2 = 0.25 + 0.75*pulseRaw;
            var grad = mrCtx.createLinearGradient(0,0,w,0);
            var steps = 60;
            for(var i=0; i<=steps; i++){
              var frac = i/steps;
              var phase = frac + mrT*0.18;
              var x = ((phase % 1) + 1) % 1;
              var tri = Math.abs(x*2 - 1);
              var hue2 = MOUSE_RGB_RAINBOW ? tri : 0;
              grad.addColorStop(frac, mrGetC(hue2, MOUSE_RGB_INTENSITY * pulse2));
            }
            mrCtx.fillStyle = grad;
            mrCtx.fillRect(0,0,w,h);
          }
          if(mrMaskImg.complete && mrMaskImg.naturalWidth > 0){
            mrCtx.globalCompositeOperation = 'destination-in';
            mrCtx.drawImage(mrMaskImg, 0, 0, w, h);
            mrCtx.globalCompositeOperation = 'source-over';
          }
        }
        requestAnimationFrame(mrTick);
      }
    })();
  }

  // ── Main render loop ──
  function loop(){
    t += 0.016;
    var W=KB_W, H=KB_H;

    // RGB
    ctx.clearRect(0,0,W,H);
    if(STYLE===1){
      var b=0.35+0.65*(0.5+0.5*Math.sin(t*1.4));
      ctx.fillStyle=getC(0,b); ctx.fillRect(0,0,W,H);
    } else if(STYLE===2){
      for(var x=0;x<W;x+=2){
        var h=(x/W+t*0.08)%1, bv=0.2+0.8*(0.5+0.5*Math.sin(t*2-(x/W)*Math.PI*4));
        ctx.fillStyle=getC(h,bv); ctx.fillRect(x,0,2,H);
      }
    } else {
      ctx.fillStyle=getC(0,0.06); ctx.fillRect(0,0,W,H);
      var now = t;
      ripples = ripples.filter(function(r){ return now-r.t < 2.5; });
      ripples.forEach(function(rip){
        var age=now-rip.t, radius=age*Math.max(W,H)*0.65;
        var alpha=Math.max(0,0.9*(1-age/2.5));
        var hue=RAINBOW?(age*0.2+rip.cx/W)%1:0;
        var grd=ctx.createRadialGradient(rip.cx,rip.cy,radius*0.8,rip.cx,rip.cy,radius);
        grd.addColorStop(0,getC(hue,0));
        grd.addColorStop(0.5,getC(hue,alpha));
        grd.addColorStop(1,getC(hue,0));
        ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
      });
    }
    if(maskImg.complete && maskImg.naturalWidth>0){
      ctx.globalCompositeOperation='destination-in';
      ctx.drawImage(maskImg,0,0,W,H);
      ctx.globalCompositeOperation='source-over';
    }

    // Key glow
    kctx.clearRect(0,0,W,H);
    KEYS.forEach(function(k){
      if(!pressedKeys[k.code]) return;
      var x=(k.cx-k.w/2)/100*W, y=(k.cy-k.h/2)/100*H;
      var w=k.w/100*W, h=k.h/100*H;
      kctx.save();
      kctx.shadowColor='rgba('+KPC+','+KPG+','+KPB+',0.9)';
      kctx.shadowBlur=KEY_PRESS_GLOW*2;
      kctx.fillStyle='rgba(0,0,0,'+(0.5*KEY_PRESS_OPACITY)+')';
      kctx.beginPath();
      kctx.roundRect(x,y,w,h,4);
      kctx.fill();
      kctx.restore();
    });

    // Mouse movement (decay)
    mouseX += (targetX - mouseX) * 0.15;
    mouseY += (targetY - mouseY) * 0.15;
    targetX *= 0.92; targetY *= 0.92;
    wrap.style.transform = 'translate('+mouseX+'px,'+mouseY+'px)';
  }

  if(maskImg.complete && maskImg.naturalWidth>0){
    setInterval(loop, 16);
  } else {
    maskImg.onload = function(){ setInterval(loop, 16); };
    setTimeout(function(){ if(maskImg.naturalWidth===0) setInterval(loop, 16); }, 500);
  }
})();
<\/script>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "overlay.html";
      a.click();
    } finally { setMkbExporting(false); }
  }, [kbSkinUrl, kbButtonsUrl, mouseSkinUrl, mkbWidth, mkbHeight, mkbColor, mouseColor, mkbRainbow, mkbRgbStyle, kbOpacity, kbGlow, mouseOpacity, mouseGlow,
      mouseInnerFade, mouseOuterFade, keyPressColor, keyPressOpacity, keyPressGlow,
      mouseRgbEnabled, mouseRgbMode, mouseRgbSpeed, mouseRgbIntensity, mouseRgbColor, mouseRgbRainbow,
      mkbShowShadow, mkbShadowIntensity, mkbShadowAngle, kbSkinContrast, kbSkinSaturate, mouseSkinContrast, mouseSkinSaturate,
      kbSkinVideoFit, mouseSkinVideoFit]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-none border-b border-border bg-card/60 backdrop-blur px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex flex-col items-center gap-0.5">
          <img src="c4d_visuals.png" alt="C4D Visuals" style={{ height:"64px", width:"auto", objectFit:"contain", filter:"brightness(1.2)" }} />
          <span className="font-bold text-[10px] tracking-widest uppercase text-muted-foreground/50">Controller Studio</span>
        </div>

        {/* Controller tabs + MKB tab */}
        <div className="flex items-center gap-1 border-l border-border pl-3">
          {CONTROLLER_TYPES.map(ct => (
            <button key={ct.id} onClick={() => {
              // Only switch when changing to a different controller.
              // Clicking the current tab while in editor mode should just exit
              // the editor — calling switchController would reset the skin that
              // was just exported via handleChange.
              if (ct.id !== configRef.current.controllerType || mkbMode) {
                switchController(ct.id);
              }
              setMkbMode(false);
              setEditorMode(false);
            }}
              className={`text-xs px-2.5 py-1 rounded-md border transition-all font-medium ${config.controllerType === ct.id && !mkbMode && !editorMode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
              {ct.label}
            </button>
          ))}
          <button onClick={() => { setMkbMode(true); setEditorMode(false); setEditMode(false); setMkbEditMode(false); }}
            className={`text-xs px-2.5 py-1 rounded-md border transition-all font-medium ${mkbMode && !editorMode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
            ⌨️ C4D.MKB
          </button>
        </div>

        {/* Preview / Edit — context-aware */}
        {!editorMode && (
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          <button onClick={() => mkbMode ? setMkbEditMode(false) : setEditMode(false)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all font-medium ${(mkbMode ? !mkbEditMode : !editMode) ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Play size={10} /> Preview
          </button>
          <button onClick={() => mkbMode ? setMkbEditMode(true) : setEditMode(true)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all font-medium ${(mkbMode ? mkbEditMode : editMode) ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Move size={10} /> {mkbMode ? "Edit Keys" : "Edit Layout"}
          </button>
        </div>
        )}

        {/* Save / Presets — works for both controller and MKB */}
        {!editorMode && (
        <div className="relative flex items-center gap-1">
          <button onClick={() => { setShowSaveInput(v => !v); setShowPresets(false); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all">
            <Save size={10} /> Save
          </button>
          <button onClick={() => { setShowPresets(v => !v); setShowSaveInput(false); }} disabled={presets.length === 0}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all ${presets.length > 0 ? "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground" : "bg-card/40 border-border/40 text-muted-foreground/30 cursor-default"}`}>
            <FolderOpen size={10} /> Presets {presets.length > 0 && <span className="text-primary font-bold">{presets.length}</span>}
          </button>
          {showSaveInput && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-lg shadow-xl p-3 w-52">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                Save {mkbMode ? "MKB key layout" : `for ${baseLayout.name}`}
              </p>
              <input autoFocus value={saveInput} onChange={e => setSaveInput(e.target.value)}
                onKeyDown={e => { e.stopPropagation(); if(e.key==="Enter") handleSave(); }}
                placeholder={`Preset ${presets.length + 1}`}
                className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 mb-2 outline-none focus:border-primary" />
              <div className="flex gap-1.5">
                <button onClick={handleSave} className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1.5 font-medium">Save</button>
                <button onClick={() => setShowSaveInput(false)} className="text-xs px-2 py-1.5 rounded border border-border text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}
          {showPresets && presets.length > 0 && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-lg shadow-xl w-56 overflow-hidden">
              <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1.5 border-b border-border">
                {mkbMode ? "MKB Presets" : `Presets — ${baseLayout.name}`}
              </p>
              {(presets as any[]).map((p, i) => (
                <div key={i} className="flex items-center px-2 py-1.5 hover:bg-muted/40 group">
                  <button onClick={() => {
                    if (mkbMode) { setKeyOverrides((p as MkbPreset).keyOverrides); setMouseOverrides((p as MkbPreset).mouseOverrides ?? []); }
                    else setOverrides((p as CtrlPreset).overrides);
                    setShowPresets(false);
                  }} className="flex-1 text-left text-xs text-foreground truncate">
                    {p.name} <span className="text-[10px] text-muted-foreground">{new Date(p.savedAt).toLocaleDateString()}</span>
                  </button>
                  <button onClick={() => {
                    const u = presets.filter((_, j) => j !== i);
                    if (mkbMode) { setMkbPresets(u as MkbPreset[]); saveMkbPresets(u as MkbPreset[]); }
                    else { setCtrlPresets(u as CtrlPreset[]); saveCtrlPresets(config.controllerType, u as CtrlPreset[]); }
                  }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        <div className="flex-1" />

        <button onClick={() => { setEditorMode(true); setMkbMode(false); }}
          className={`text-sm px-4 py-1.5 rounded-md border transition-all font-semibold ${editorMode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
          🖌️ Editor
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">

        {/* ImageEditor — always mounted so loaded images, logo state, and undo
            history survive switching between editor mode and the normal view.
            display:none hides it visually but keeps the React tree alive. */}
        <div className={editorMode ? "flex-1 min-w-0 min-h-0" : "hidden"}>
          <ImageEditor
            onExportToSkin={handleExportFromEditor}
            onClearSlot={handleClearSlot}
            onExportMkbSkin={handleExportMkbSkin}
            onClearMkbSlot={handleClearMkbSlot}
            pendingSkins={pendingSkins}
            activeControllerType={config.controllerType}
            activeConfig={config}
            activeMkbConfig={{ kbSkin: kbSkinUrl, mouseSkin: mouseSkinUrl, kbButtonsSkin: kbButtonsUrl }}
          />
        </div>

        {/* Normal view — conditionally rendered (state lives in Studio, safe to remount) */}
        {!editorMode && (
        <>
        {/* Left panel */}
        <aside className="w-52 flex-none border-r border-border bg-card/40 overflow-y-auto">
          {mkbMode
            ? <MkbSkinPanel kbSkinUrl={kbSkinUrl} mouseSkinUrl={mouseSkinUrl} kbButtonsUrl={kbButtonsUrl}
                onKbChange={setKbSkinUrl} onMouseChange={setMouseSkinUrl} onKbButtonsChange={setKbButtonsUrl}
                kbSkinVideoFit={kbSkinVideoFit} onKbVideoFit={setKbSkinVideoFit}
                kbSkinContrast={kbSkinContrast} onKbContrast={setKbSkinContrast}
                kbSkinSaturate={kbSkinSaturate} onKbSaturate={setKbSkinSaturate}
                mouseSkinVideoFit={mouseSkinVideoFit} onMouseVideoFit={setMouseSkinVideoFit}
                mouseSkinContrast={mouseSkinContrast} onMouseContrast={setMouseSkinContrast}
                mouseSkinSaturate={mouseSkinSaturate} onMouseSaturate={setMouseSkinSaturate} />
            : <SkinPanel config={config} onChange={handleChange} stickSizePx={stickSizePx} bodySizeLabel={bodySizeLabel} />
          }
        </aside>

        {/* Center */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 min-h-0">
            {mkbMode ? (
              <div className="flex items-center justify-center w-full flex-1 min-h-0 rounded-xl"
                style={{ backgroundImage:"url(editor-checker-tile.png)", backgroundSize:"136px 54px", backgroundRepeat:"repeat", backgroundColor:"#1a1a22" }}>
              <div className="inline-flex rounded-xl overflow-hidden">
                <MkbView
                  color={mkbColor}
                  keyPressColor={keyPressColor}
                  keyPressOpacity={keyPressOpacity}
                  keyPressGlow={keyPressGlow}
                  kbOpacity={kbRgbVisible ? kbOpacity : 0} kbGlow={kbGlow}
                  mouseColor={mouseColor} mouseOpacity={mouseOpacity} mouseGlow={mouseGlow} mouseInnerFade={mouseInnerFade} mouseOuterFade={mouseOuterFade}
                  mouseRgbEnabled={mouseRgbEnabled} mouseRgbMode={mouseRgbMode} mouseRgbSpeed={mouseRgbSpeed}
                  mouseRgbIntensity={mouseRgbIntensity} mouseRgbColor={mouseRgbColor} mouseRgbRainbow={mouseRgbRainbow}
                  mkbShowShadow={mkbShowShadow} mkbShadowIntensity={mkbShadowIntensity} mkbShadowAngle={mkbShadowAngle}
                  rgbStyle={mkbRgbStyle}
                  onRgbStyleChange={(s) => { setMkbRgbStyle(s); setKbRgbVisible(true); }}
                  rainbow={mkbRainbow}
                  onRainbowChange={setMkbRainbow}
                  onRgbOff={() => setKbRgbVisible(false)}
                  keyboardSkinUrl={kbSkinUrl}
                  keyboardButtonsUrl={kbButtonsUrl}
                  mouseSkinUrl={mouseSkinUrl}
                  kbSkinVideoFit={kbSkinVideoFit}
                  kbSkinContrast={kbSkinContrast}
                  kbSkinSaturate={kbSkinSaturate}
                  mouseSkinVideoFit={mouseSkinVideoFit}
                  mouseSkinContrast={mouseSkinContrast}
                  mouseSkinSaturate={mouseSkinSaturate}
                  editMode={mkbEditMode}
                  keyOverrides={keyOverrides}
                  mouseOverrides={mouseOverrides}
                  onKeyOverridesChange={setKeyOverrides}
                  onMouseOverridesChange={setMouseOverrides}
                  onGetMasksRef={getMasksRef}
                />
              </div>
              </div>
            ) : (
              <>
                <div className="w-full flex-1 min-h-0 flex items-center justify-center rounded-xl"
                  style={editMode ? {} : { backgroundImage: "url(editor-checker-tile.png)", backgroundSize: "136px 54px", backgroundRepeat: "repeat", backgroundColor: "#1a1a22" }}>
                  <div className="w-full h-full max-w-3xl flex items-center">
                    <div className={`w-full rounded-xl overflow-hidden ${editMode ? "border shadow-2xl" : ""}`}
                      style={editMode ? { borderColor: "hsl(262 80% 65% / 0.6)", borderWidth: "2px" } : undefined}>
                      <ControllerPreview config={config} overrides={overrides} showButtonLabels={showButtonLabels}
                        editMode={editMode} onOverridesChange={setOverrides} />
                    </div>
                  </div>
                </div>
                {!editMode && (
                  <div className="w-full max-w-3xl flex items-center justify-between gap-4 px-1" style={{ opacity: gp.connected ? 1 : 0.35 }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/60 font-mono w-5">{ltLabel}</span>
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-orange-400 rounded-full transition-all duration-[60ms]" style={{ width: `${(gp.triggers[0] ?? 0) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-white/40 font-mono w-5">{Math.round((gp.triggers[0] ?? 0) * 100)}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">{gp.connected ? "Press buttons to test" : "Connect a gamepad"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/40 font-mono w-5 text-right">{Math.round((gp.triggers[1] ?? 0) * 100)}</span>
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-orange-400 rounded-full transition-all duration-[60ms]" style={{ width: `${(gp.triggers[1] ?? 0) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-white/60 font-mono w-5">{rtLabel}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Right panel — context-aware */}
        <aside className="w-56 flex-none border-l border-border bg-card/40 flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col p-3">
            {mkbMode
              ? <MkbConfigPanel
                  color={mkbColor} onColorChange={setMkbColor}
                  keyPressColor={keyPressColor} onKeyPressColorChange={setKeyPressColor}
                  keyPressOpacity={keyPressOpacity} onKeyPressOpacity={setKeyPressOpacity}
                  keyPressGlow={keyPressGlow} onKeyPressGlow={setKeyPressGlow}
                  mouseColor={mouseColor} onMouseColorChange={setMouseColor}
                  keyOverrides={keyOverrides} mouseOverrides={mouseOverrides}
                  rgbStyle={mkbRgbStyle} onRgbStyleChange={setMkbRgbStyle}
                  rainbow={mkbRainbow} onRainbowChange={setMkbRainbow}
                  kbOpacity={kbOpacity} onKbOpacity={setKbOpacity}
                  kbGlow={kbGlow} onKbGlow={setKbGlow}
                  mouseOpacity={mouseOpacity} onMouseOpacity={setMouseOpacity}
                  mouseGlow={mouseGlow} onMouseGlow={setMouseGlow}
                  mouseInnerFade={mouseInnerFade} onMouseInnerFade={setMouseInnerFade}
                  mouseOuterFade={mouseOuterFade} onMouseOuterFade={setMouseOuterFade}
                  mouseRgbEnabled={mouseRgbEnabled} onMouseRgbEnabled={setMouseRgbEnabled}
                  mouseRgbMode={mouseRgbMode} onMouseRgbMode={setMouseRgbMode}
                  mouseRgbSpeed={mouseRgbSpeed} onMouseRgbSpeed={setMouseRgbSpeed}
                  mouseRgbIntensity={mouseRgbIntensity} onMouseRgbIntensity={setMouseRgbIntensity}
                  mouseRgbColor={mouseRgbColor} onMouseRgbColor={setMouseRgbColor}
                  mouseRgbRainbow={mouseRgbRainbow} onMouseRgbRainbow={setMouseRgbRainbow}
                  mkbShowShadow={mkbShowShadow} onMkbShowShadow={setMkbShowShadow}
                  mkbShadowIntensity={mkbShadowIntensity} onMkbShadowIntensity={setMkbShadowIntensity}
                  mkbShadowAngle={mkbShadowAngle} onMkbShadowAngle={setMkbShadowAngle}
                  kbSkinUrl={kbSkinUrl} kbButtonsUrl={kbButtonsUrl} mouseSkinUrl={mouseSkinUrl}
                  mkbWidth={mkbWidth} mkbHeight={mkbHeight}
                  onMkbSizeChange={(w,h)=>{setMkbWidth(w);setMkbHeight(h);}}
                  onExport={handleExportMkb} exporting={mkbExporting}
                />
              : <ConfigPanel config={config} overrides={overrides} onChange={handleChange}
                  onResetOverrides={handleResetOverrides} showButtonLabels={showButtonLabels}
                  onToggleLabels={setShowButtonLabels} />
            }
          </div>
        </aside>
        </>
        )}
      </div>
    </div>
  );
}

// ── MKB Skin Panel ────────────────────────────────────────────────────────
/** Keyboard Body, Keyboard Keys, and Mouse libraries — each is a single flat
 *  list, no tabs, strictly scoped to its own section (MKB only has one shape,
 *  unlike controller body which varies per controller type). */
const KEYBOARD_BODY_LIBRARY: LibraryEntry[] = [
  { id:"kb-default", name:"Default", url:"mkb/keyboard-empty.png" },
];
const KEYBOARD_KEYS_LIBRARY: LibraryEntry[] = [
  { id:"kb-keys-default", name:"Default", url:"mkb/keyboard-buttons.png" },
];
const MOUSE_LIBRARY: LibraryEntry[] = [
  { id:"mouse-default", name:"Default", url:"mkb/mouse.png" },
];

function MkbUploadSlot({ label, value, defaultUrl, onUpload, onClear, accept, hint, allowVideo, isVideo, videoFit, onVideoFit, contrast, onContrast, saturate, onSaturate, onOpenLibrary }: {
  label: string; value: string; defaultUrl: string;
  onUpload: (u: string) => void; onClear: () => void;
  accept?: string; hint?: string; allowVideo?: boolean;
  isVideo?: boolean;
  videoFit?: "contain"|"cover"; onVideoFit?: (v:"contain"|"cover")=>void;
  contrast?: number; onContrast?: (v:number)=>void;
  saturate?: number; onSaturate?: (v:number)=>void;
  onOpenLibrary?: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { if (typeof ev.target?.result === "string") onUpload(ev.target.result); };
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  const isTemplate = value === defaultUrl;
  const hasValue = !!value;
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
      {hasValue ? (
        <Popover>
          <div className="relative rounded-lg border border-border bg-card group">
            <div className="w-full h-36 p-2 rounded-lg overflow-hidden" style={{
              backgroundImage:"url(editor-checker-tile.png)",
              backgroundSize:"136px 54px", backgroundRepeat:"repeat", backgroundColor:"#1a1a22",
            }}>
              {isVideo
                ? <video src={value} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                : <img src={value} alt={label} className="w-full h-full object-contain" />
              }
            </div>
            {isVideo && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] bg-violet-600/90 text-white px-1.5 py-0.5 rounded font-medium">
                <Film size={9} /> WebM
              </div>
            )}
            {isTemplate && !isVideo && (
              <div className="absolute top-1.5 left-1.5 text-[9px] bg-primary/80 text-white px-1.5 py-0.5 rounded font-medium">Template</div>
            )}
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => inputRef.current?.click()}
                className="p-1 rounded-full bg-black/60 text-white hover:bg-primary transition-colors">
                <Upload size={11} />
              </button>
              {isVideo && allowVideo && (
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-full bg-black/60 text-violet-300 hover:bg-violet-600 transition-colors" title="Video options">
                    <Settings2 size={11} />
                  </button>
                </PopoverTrigger>
              )}
              <button onClick={onClear}
                className="p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors">
                <X size={11} />
              </button>
            </div>
          </div>
          {isVideo && allowVideo && (
            <PopoverContent side="right" sideOffset={8} align="start" className="w-56 p-3 space-y-3">
              <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Film size={10} className="text-violet-400" /> WebM Options
              </p>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fit</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["contain","cover"] as const).map(mode => (
                    <button key={mode} onClick={() => onVideoFit?.(mode)}
                      className={`flex flex-col items-center py-1.5 rounded text-[10px] border transition-all ${
                        (videoFit ?? "contain") === mode
                          ? "bg-violet-600/20 border-violet-500/60 text-violet-300"
                          : "bg-muted/20 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}>
                      <span className="font-semibold capitalize">{mode}</span>
                      <span className="opacity-60 mt-0.5">{mode === "contain" ? "Letterbox" : "Crop sides"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] text-muted-foreground">Contrast</label>
                  <span className="text-[10px] font-mono text-muted-foreground">{(contrast ?? 1).toFixed(2)}×</span>
                </div>
                <input type="range" min="0.5" max="2" step="0.01" value={contrast ?? 1}
                  onChange={e => onContrast?.(parseFloat(e.target.value))}
                  className="w-full h-1 accent-violet-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] text-muted-foreground">Saturation</label>
                  <span className="text-[10px] font-mono text-muted-foreground">{(saturate ?? 1).toFixed(2)}×</span>
                </div>
                <input type="range" min="0.5" max="2" step="0.01" value={saturate ?? 1}
                  onChange={e => onSaturate?.(parseFloat(e.target.value))}
                  className="w-full h-1 accent-violet-500" />
              </div>
              <p className="text-[9px] text-muted-foreground/50 leading-snug border-t border-border pt-2">
                Washed out? Try Contrast 1.15 + Saturation 1.10. Permanent fix: re-encode with{" "}
                <code className="bg-muted/40 px-0.5 rounded">-color_range 2</code> in FFmpeg.
              </p>
            </PopoverContent>
          )}
        </Popover>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-36 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground">
          <Upload size={18} />
          <span className="text-xs">Upload {label}</span>
          {hint && <span className="text-[10px] opacity-60">{hint}</span>}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept ?? "image/png,image/jpeg,image/webp"} className="hidden" onChange={handleFile} />
    </div>
  );
}

function isVideoUrl(url: string): boolean {
  return url.startsWith("data:video/") || url.startsWith("blob:") || url.endsWith(".webm") || url.endsWith(".mp4");
}

function MkbSkinPanel({ kbSkinUrl, mouseSkinUrl, kbButtonsUrl, onKbChange, onMouseChange, onKbButtonsChange,
  kbSkinVideoFit, onKbVideoFit, kbSkinContrast, onKbContrast, kbSkinSaturate, onKbSaturate,
  mouseSkinVideoFit, onMouseVideoFit, mouseSkinContrast, onMouseContrast, mouseSkinSaturate, onMouseSaturate }: {
  kbSkinUrl:string; mouseSkinUrl:string; kbButtonsUrl:string;
  onKbChange:(u:string)=>void; onMouseChange:(u:string)=>void; onKbButtonsChange:(u:string)=>void;
  kbSkinVideoFit:"contain"|"cover"; onKbVideoFit:(v:"contain"|"cover")=>void;
  kbSkinContrast:number; onKbContrast:(v:number)=>void;
  kbSkinSaturate:number; onKbSaturate:(v:number)=>void;
  mouseSkinVideoFit:"contain"|"cover"; onMouseVideoFit:(v:"contain"|"cover")=>void;
  mouseSkinContrast:number; onMouseContrast:(v:number)=>void;
  mouseSkinSaturate:number; onMouseSaturate:(v:number)=>void;
}) {
  const DEFAULT_KB = "mkb/keyboard-empty.png";
  const DEFAULT_KB_BTN = "mkb/keyboard-buttons.png";
  const DEFAULT_MOUSE = "mkb/mouse.png";
  const [showKbLib, setShowKbLib] = React.useState(false);
  const [showKbKeysLib, setShowKbKeysLib] = React.useState(false);
  const [showMouseLib, setShowMouseLib] = React.useState(false);
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <ImageIcon size={16} className="text-primary" />
        <span className="text-sm font-semibold">MKB Skins</span>
      </div>
      <MkbUploadSlot label="Keyboard Skin" value={kbSkinUrl} defaultUrl={DEFAULT_KB}
        onUpload={onKbChange} onClear={() => onKbChange(DEFAULT_KB)}
        accept="image/png,image/jpeg,image/webp,video/webm" allowVideo
        isVideo={isVideoUrl(kbSkinUrl)}
        videoFit={kbSkinVideoFit} onVideoFit={onKbVideoFit}
        contrast={kbSkinContrast} onContrast={onKbContrast}
        saturate={kbSkinSaturate} onSaturate={onKbSaturate}
        onOpenLibrary={() => setShowKbLib(true)} />
      {showKbLib && (
        <LibraryPicker title="Keyboard Body Library" section="kb-body" staticEntries={KEYBOARD_BODY_LIBRARY}
          current={kbSkinUrl} onSelect={onKbChange} onClose={() => setShowKbLib(false)} />
      )}

      <MkbUploadSlot label="Keyboard Keys PNG" value={kbButtonsUrl} defaultUrl={DEFAULT_KB_BTN}
        onUpload={onKbButtonsChange} onClear={() => onKbButtonsChange(DEFAULT_KB_BTN)}
        accept="image/png,image/jpeg,image/webp" hint="Transparent key shapes overlay"
        onOpenLibrary={() => setShowKbKeysLib(true)} />
      {showKbKeysLib && (
        <LibraryPicker title="Keyboard Keys Library" section="kb-keys" staticEntries={KEYBOARD_KEYS_LIBRARY}
          current={kbButtonsUrl} onSelect={onKbButtonsChange} onClose={() => setShowKbKeysLib(false)} />
      )}

      <MkbUploadSlot label="Mouse Skin" value={mouseSkinUrl} defaultUrl={DEFAULT_MOUSE}
        onUpload={onMouseChange} onClear={() => onMouseChange(DEFAULT_MOUSE)}
        accept="image/png,image/jpeg,image/webp,video/webm" allowVideo
        isVideo={isVideoUrl(mouseSkinUrl)}
        videoFit={mouseSkinVideoFit} onVideoFit={onMouseVideoFit}
        contrast={mouseSkinContrast} onContrast={onMouseContrast}
        saturate={mouseSkinSaturate} onSaturate={onMouseSaturate}
        onOpenLibrary={() => setShowMouseLib(true)} />
      {showMouseLib && (
        <LibraryPicker title="Mouse Skin Library" section="mouse" staticEntries={MOUSE_LIBRARY}
          current={mouseSkinUrl} onSelect={onMouseChange} onClose={() => setShowMouseLib(false)} />
      )}
    </div>
  );
}

// ── MKB helper UI components ─────────────────────────────────────────────────
function MkbSlider({label,value,min,max,step,display,onChange}:{label:string;value:number;min:number;max:number;step:number;display:string;onChange:(v:number)=>void}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono text-foreground/50">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 rounded-full cursor-pointer" />
    </div>
  );
}
function MkbToggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button onClick={()=>onChange(!value)} style={{minWidth:"36px"}}
        className={"relative flex-none w-9 h-5 rounded-full transition-colors duration-200 "+(value?"bg-primary":"bg-muted")}>
        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
          style={{left:value?"calc(100% - 18px)":"2px"}}/>
      </button>
    </div>
  );
}
function MkbDropdown({title, children}:{title:string; children:React.ReactNode}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-card hover:bg-muted/40 transition-colors">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">{title}</span>
        <span className={`text-muted-foreground text-xs transition-transform duration-200 ${open?"rotate-180":""}`}>▾</span>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 border-t border-border bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ── MKB Config Panel (right sidebar when in MKB mode) ─────────────────────
type RgbStyle = 1|2|3;

interface MkbConfigProps {
  color: string; onColorChange: (c:string)=>void;
  keyPressColor: string; onKeyPressColorChange: (c:string)=>void;
  keyPressOpacity: number; onKeyPressOpacity: (v:number)=>void;
  keyPressGlow: number; onKeyPressGlow: (v:number)=>void;
  mouseColor: string; onMouseColorChange: (c:string)=>void;
  rgbStyle: RgbStyle; onRgbStyleChange: (s:RgbStyle)=>void;
  rainbow: boolean; onRainbowChange: (v:boolean)=>void;
  kbOpacity: number; onKbOpacity: (v:number)=>void;
  kbGlow: number; onKbGlow: (v:number)=>void;
  mouseOpacity: number; onMouseOpacity: (v:number)=>void;
  mouseGlow: number; onMouseGlow: (v:number)=>void;
  mouseInnerFade: boolean; onMouseInnerFade: (v:boolean)=>void;
  mouseOuterFade: boolean; onMouseOuterFade: (v:boolean)=>void;
  mouseRgbEnabled: boolean; onMouseRgbEnabled: (v:boolean)=>void;
  mouseRgbMode: "wave"|"breathing"; onMouseRgbMode: (v:"wave"|"breathing")=>void;
  mouseRgbSpeed: number; onMouseRgbSpeed: (v:number)=>void;
  mouseRgbIntensity: number; onMouseRgbIntensity: (v:number)=>void;
  mouseRgbColor: string; onMouseRgbColor: (v:string)=>void;
  mouseRgbRainbow: boolean; onMouseRgbRainbow: (v:boolean)=>void;
  mkbShowShadow: boolean; onMkbShowShadow: (v:boolean)=>void;
  mkbShadowIntensity: number; onMkbShadowIntensity: (v:number)=>void;
  mkbShadowAngle: number; onMkbShadowAngle: (v:number)=>void;
  keyOverrides: Record<string,{cx:number;cy:number;w:number;h:number}>;
  mouseOverrides: {id:string;cx:number;cy:number;w:number;h:number}[];
  kbSkinUrl: string; kbButtonsUrl: string; mouseSkinUrl: string;
  mkbWidth: number; mkbHeight: number;
  onMkbSizeChange: (w:number,h:number)=>void;
  onExport: ()=>void;
  exporting: boolean;
}

function MkbConfigPanel({ color, onColorChange, keyPressColor, onKeyPressColorChange, keyPressOpacity, onKeyPressOpacity, keyPressGlow, onKeyPressGlow, mouseColor, onMouseColorChange,
  rgbStyle, onRgbStyleChange, rainbow, onRainbowChange,
  kbOpacity, onKbOpacity, kbGlow, onKbGlow,
  mouseOpacity, onMouseOpacity, mouseGlow, onMouseGlow, mouseInnerFade, onMouseInnerFade, mouseOuterFade, onMouseOuterFade,
  mouseRgbEnabled, onMouseRgbEnabled, mouseRgbMode, onMouseRgbMode, mouseRgbSpeed, onMouseRgbSpeed,
  mouseRgbIntensity, onMouseRgbIntensity, mouseRgbColor, onMouseRgbColor, mouseRgbRainbow, onMouseRgbRainbow,
  mkbShowShadow, onMkbShowShadow, mkbShadowIntensity, onMkbShadowIntensity, mkbShadowAngle, onMkbShadowAngle,
  keyOverrides, mouseOverrides,
  kbSkinUrl, kbButtonsUrl, mouseSkinUrl, mkbWidth, mkbHeight, onMkbSizeChange, onExport, exporting }: MkbConfigProps) {
  const styleLabels: Record<RgbStyle,string> = {1:"Breathe",2:"Wave",3:"Ripple"};

  // Export handled by parent via prop


  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Scrollable content */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
      {/* RGB Section */}
      <MkbDropdown title="🌈 RGB">
        <div className="flex flex-col gap-1.5">
          {([1,2,3] as RgbStyle[]).map(s => (
            <button key={s} onClick={() => onRgbStyleChange(s)}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all text-left ${rgbStyle===s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
              Style {s} · {styleLabels[s]}
            </button>
          ))}
          <button onClick={() => onRainbowChange(!rainbow)}
            className="text-xs px-3 py-1.5 rounded-md border font-medium transition-all text-left"
            style={rainbow ? {background:"linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)",color:"#fff",borderColor:"transparent"} : {background:"var(--card)",borderColor:"var(--border)",color:"var(--muted-foreground)"}}>
            🌈 Rainbow {rainbow ? "(on)" : "(off)"}
          </button>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => onColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5" />
            <span className="text-xs font-mono text-foreground/50">{color}</span>
            <span className="text-xs text-foreground/40">RGB Color</span>
          </div>
          <MkbSlider label="Glow Strength" value={kbOpacity} min={0.05} max={1} step={0.05}
            display={Math.round(kbOpacity*100)+"%"} onChange={onKbOpacity} />
        </div>
      </MkbDropdown>

      {/* Keyboard appearance */}
      <MkbDropdown title="⌨️ Keyboard">
        <div className="flex items-center gap-2">
          <input type="color" value={keyPressColor} onChange={e => onKeyPressColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5" />
          <span className="text-xs font-mono text-foreground/50">{keyPressColor}</span>
          <span className="text-xs text-foreground/40">Key Press</span>
        </div>
        <MkbSlider label="Opacity" value={keyPressOpacity} min={0.05} max={1} step={0.05}
          display={Math.round(keyPressOpacity*100)+"%"} onChange={onKeyPressOpacity} />
        <MkbSlider label="Glow Strength" value={keyPressGlow} min={0} max={20} step={1}
          display={keyPressGlow+"px"} onChange={onKeyPressGlow} />
      </MkbDropdown>

      {/* Mouse */}
      <MkbDropdown title="🖱️ Mouse">
        <div className="flex items-center gap-2">
          <input type="color" value={mouseColor} onChange={e => onMouseColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5" />
          <span className="text-xs font-mono text-foreground/50">{mouseColor}</span>
        </div>
        <MkbSlider label="Opacity" value={mouseOpacity} min={0.05} max={1} step={0.05}
          display={Math.round(mouseOpacity*100)+"%"} onChange={onMouseOpacity} />
        <MkbSlider label="Glow Strength" value={mouseGlow} min={0} max={20} step={1}
          display={mouseGlow+"px"} onChange={onMouseGlow} />
        <MkbToggle label="Inner Fade" value={mouseInnerFade} onChange={onMouseInnerFade} />
        <MkbToggle label="Outer Fade" value={mouseOuterFade} onChange={onMouseOuterFade} />
      </MkbDropdown>

      <MkbDropdown title="🌈 Mouse RGB">
        <MkbToggle label="Enable RGB" value={mouseRgbEnabled} onChange={onMouseRgbEnabled} />
        {mouseRgbEnabled && (
          <>
            <div className="grid grid-cols-2 gap-1">
              {(["wave","breathing"] as const).map(m=>(
                <button key={m} onClick={()=>onMouseRgbMode(m)}
                  className={`text-xs px-1.5 py-1 rounded border transition-all ${mouseRgbMode===m?"bg-primary text-primary-foreground border-primary":"bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                  {m==="wave"?"Wave":"Breathing"}
                </button>
              ))}
            </div>
            <MkbSlider label="Speed" value={mouseRgbSpeed} min={1} max={20} step={0.5}
              display={`${mouseRgbSpeed}s`} onChange={onMouseRgbSpeed} />
            <MkbSlider label="Intensity" value={mouseRgbIntensity} min={0.05} max={1} step={0.05}
              display={`${Math.round(mouseRgbIntensity*100)}%`} onChange={onMouseRgbIntensity} />
            <MkbToggle label="Rainbow" value={mouseRgbRainbow} onChange={onMouseRgbRainbow} />
            {!mouseRgbRainbow && (
              <div className="flex items-center gap-2">
                <input type="color" value={mouseRgbColor} onChange={e=>onMouseRgbColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border bg-card p-0.5" />
                <span className="text-xs font-mono text-foreground/50">{mouseRgbColor}</span>
              </div>
            )}
          </>
        )}
      </MkbDropdown>

      {/* Drop Shadow */}
      <MkbDropdown title="💡 Drop Shadow">
        <MkbToggle label="Drop Shadow" value={mkbShowShadow} onChange={onMkbShowShadow} />
        {mkbShowShadow && (
          <>
            <MkbSlider label="Intensity" value={mkbShadowIntensity} min={0.1} max={1} step={0.05}
              display={Math.round(mkbShadowIntensity*100)+"%"} onChange={onMkbShadowIntensity} />
            <MkbSlider label="Angle" value={mkbShadowAngle} min={0} max={360} step={1}
              display={mkbShadowAngle+"°"} onChange={onMkbShadowAngle} />
          </>
        )}
      </MkbDropdown>
      </div>{/* end scrollable content */}

      {/* Export — pinned at bottom */}
      <div className="space-y-1 pt-1 border-t border-border">
        <p className="text-[10px] text-muted-foreground/50">OBS Browser Source: 1920×1080</p>
        <button onClick={onExport} disabled={exporting}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-wait">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? "Exporting…" : "Export HTML for OBS"}
        </button>
      </div>
    </div>
  );
}
