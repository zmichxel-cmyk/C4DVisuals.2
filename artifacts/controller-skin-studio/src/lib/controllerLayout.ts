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

export interface ControllerLayout {
  name: string;
  defaultSkinUrl: string;
  defaultWidth: number;
  defaultHeight: number;
  buttonColors: Record<number, string>;
  buttons: ButtonDef[];
  sticks: StickDef[];
}

// Computes rendered height% for a button shape given its size%
export function buttonHeightPct(btn: ButtonDef): number {
  if (btn.shape === "pill-h" || btn.shape === "rect") return btn.size * 0.45;
  return btn.size;
}

// Border radius string for a button shape
export function buttonBorderRadius(shape: ButtonDef["shape"]): string {
  if (shape === "circle" || shape.startsWith("cross")) return "50%";
  if (shape === "rect") return "8px";
  return "9999px";
}

export const STICK_COLORS = ["#a855f7", "#14b8a6"] as const;
