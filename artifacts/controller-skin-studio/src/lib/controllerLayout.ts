export interface ButtonDef {
  index: number;
  label: string;
  x: number;
  y: number;
  size: number;
  shape: "circle" | "pill-h" | "pill-v" | "cross-up" | "cross-down" | "cross-left" | "cross-right";
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
  buttons: ButtonDef[];
  sticks: StickDef[];
}

export const XBOX_LAYOUT: ControllerLayout = {
  buttons: [
    { index: 0,  label: "A",    x: 72.5, y: 63,   size: 4.5, shape: "circle" },
    { index: 1,  label: "B",    x: 77.5, y: 52,   size: 4.5, shape: "circle" },
    { index: 2,  label: "X",    x: 67.5, y: 52,   size: 4.5, shape: "circle" },
    { index: 3,  label: "Y",    x: 72.5, y: 41,   size: 4.5, shape: "circle" },
    { index: 4,  label: "LB",   x: 23,   y: 30,   size: 9,   shape: "pill-h" },
    { index: 5,  label: "RB",   x: 73,   y: 30,   size: 9,   shape: "pill-h" },
    { index: 6,  label: "LT",   x: 22,   y: 19,   size: 9,   shape: "pill-h" },
    { index: 7,  label: "RT",   x: 74,   y: 19,   size: 9,   shape: "pill-h" },
    { index: 8,  label: "View", x: 40,   y: 47,   size: 3.5, shape: "circle" },
    { index: 9,  label: "Menu", x: 57,   y: 47,   size: 3.5, shape: "circle" },
    { index: 10, label: "LS",   x: 33,   y: 60,   size: 4,   shape: "circle" },
    { index: 11, label: "RS",   x: 62,   y: 71,   size: 4,   shape: "circle" },
    { index: 12, label: "↑",    x: 28.5, y: 51.5, size: 3.5, shape: "cross-up" },
    { index: 13, label: "↓",    x: 28.5, y: 62.5, size: 3.5, shape: "cross-down" },
    { index: 14, label: "←",    x: 23,   y: 57,   size: 3.5, shape: "cross-left" },
    { index: 15, label: "→",    x: 34,   y: 57,   size: 3.5, shape: "cross-right" },
    { index: 16, label: "⊙",    x: 48.5, y: 46,   size: 5,   shape: "circle" },
  ],
  sticks: [
    { axisX: 0, axisY: 1, label: "LS", x: 33, y: 60, size: 12, travel: 18 },
    { axisX: 2, axisY: 3, label: "RS", x: 62, y: 71, size: 12, travel: 18 },
  ],
};

// Button colors for the editor UI
export const BUTTON_COLORS: Record<number, string> = {
  0:  "#22c55e", // A - green
  1:  "#ef4444", // B - red
  2:  "#3b82f6", // X - blue
  3:  "#eab308", // Y - yellow
  4:  "#06b6d4", // LB - cyan
  5:  "#06b6d4", // RB - cyan
  6:  "#f97316", // LT - orange
  7:  "#f97316", // RT - orange
  8:  "#94a3b8", // View - slate
  9:  "#94a3b8", // Menu - slate
  10: "#8b5cf6", // LS - purple
  11: "#8b5cf6", // RS - purple
  12: "#e2e8f0", // D-up
  13: "#e2e8f0", // D-down
  14: "#e2e8f0", // D-left
  15: "#e2e8f0", // D-right
  16: "#f59e0b", // Home - amber
};

export const STICK_COLORS = ["#a855f7", "#14b8a6"] as const;
