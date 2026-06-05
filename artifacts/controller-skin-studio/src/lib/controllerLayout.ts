export interface ButtonDef {
  index: number;
  label: string;
  x: number;
  y: number;
  size: number;
  shape: "circle" | "pill-h" | "pill-v" | "rect" | "cross-up" | "cross-down" | "cross-left" | "cross-right";
}

export interface StickDef {
  axisX: number;
  axisY: number;
  label: string;
  x: number;
  y: number;
  size: number;
  travel: number;
}

export interface ButtonMaskDef {
  url: string;
  cx: number;
  cy: number;
}

export interface ControllerLayout {
  name: string;
  connectMessage: string;
  defaultSkinUrl: string;
  defaultLeftStickUrl: string;
  defaultRightStickUrl: string;
  defaultWidth: number;
  defaultHeight: number;
  buttonColors: Record<number, string>;
  buttonMasks: Record<number, ButtonMaskDef>;
  buttons: ButtonDef[];
  sticks: StickDef[];
}

export function buttonHeightPct(btn: ButtonDef): number {
  if (btn.shape === "pill-h" || btn.shape === "rect") return btn.size * 0.45;
  return btn.size;
}

export function buttonBorderRadius(shape: ButtonDef["shape"]): string {
  if (shape === "circle" || shape.startsWith("cross")) return "50%";
  if (shape === "rect") return "8px";
  return "9999px";
}

export function hexToRgba(hex: string, alpha: number): string {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  } catch {
    return hex;
  }
}

export const STICK_COLORS = ["#a855f7", "#14b8a6"] as const;
