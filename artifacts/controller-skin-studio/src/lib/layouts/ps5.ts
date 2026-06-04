import { ControllerLayout } from "../controllerLayout";

const PS_COLORS = {
  cross:    "#3b82f6",
  circle:   "#ef4444",
  square:   "#ec4899",
  triangle: "#22c55e",
};

export const ps5Layout: ControllerLayout = {
  name: "PS5",
  defaultSkinUrl: "/ps5-default.png",
  defaultWidth: 1024,
  defaultHeight: 1024,
  buttonColors: {
    0:  PS_COLORS.cross,
    1:  PS_COLORS.circle,
    2:  PS_COLORS.square,
    3:  PS_COLORS.triangle,
    4:  "#06b6d4", // L1
    5:  "#06b6d4", // R1
    6:  "#f97316", // L2
    7:  "#f97316", // R2
    8:  "#94a3b8", // Create
    9:  "#94a3b8", // Options
    10: "#8b5cf6", // L3
    11: "#8b5cf6", // R3
    12: "#e2e8f0", // D-up
    13: "#e2e8f0", // D-down
    14: "#e2e8f0", // D-left
    15: "#e2e8f0", // D-right
    16: "#3b82f6", // PS button
    17: "#8b5cf6", // Touchpad click
  },
  buttons: [
    // Face buttons
    { index: 0,  label: "✕",      x: 77,   y: 51,   size: 5.5, shape: "circle" },
    { index: 1,  label: "○",      x: 85,   y: 44,   size: 5.5, shape: "circle" },
    { index: 2,  label: "□",      x: 69,   y: 44,   size: 5.5, shape: "circle" },
    { index: 3,  label: "△",      x: 77,   y: 37,   size: 5.5, shape: "circle" },
    // Bumpers
    { index: 4,  label: "L1",     x: 21,   y: 24,   size: 11,  shape: "pill-h" },
    { index: 5,  label: "R1",     x: 76,   y: 24,   size: 11,  shape: "pill-h" },
    // Triggers (analog)
    { index: 6,  label: "L2",     x: 19,   y: 10,   size: 11,  shape: "pill-h" },
    { index: 7,  label: "R2",     x: 79,   y: 10,   size: 11,  shape: "pill-h" },
    // Center buttons
    { index: 8,  label: "Create", x: 37,   y: 38,   size: 4,   shape: "circle" },
    { index: 9,  label: "Opts",   x: 61,   y: 38,   size: 4,   shape: "circle" },
    // Stick press
    { index: 10, label: "L3",     x: 37,   y: 68,   size: 4.5, shape: "circle" },
    { index: 11, label: "R3",     x: 63,   y: 68,   size: 4.5, shape: "circle" },
    // D-pad (left side — PS5: left stick lower, d-pad upper-left)
    { index: 12, label: "↑",     x: 20,   y: 42,   size: 4,   shape: "cross-up"    },
    { index: 13, label: "↓",     x: 20,   y: 58,   size: 4,   shape: "cross-down"  },
    { index: 14, label: "←",     x: 12,   y: 50,   size: 4,   shape: "cross-left"  },
    { index: 15, label: "→",     x: 28,   y: 50,   size: 4,   shape: "cross-right" },
    // PS button
    { index: 16, label: "PS",    x: 48,   y: 56,   size: 6,   shape: "circle" },
    // Touchpad (large — PS5's defining feature)
    { index: 17, label: "TP",    x: 48,   y: 30,   size: 28,  shape: "rect" },
  ],
  sticks: [
    // PS5: left stick lower-left, right stick lower-right (different from Xbox!)
    { axisX: 0, axisY: 1, label: "L3", x: 37, y: 68, size: 12, travel: 16 },
    { axisX: 2, axisY: 3, label: "R3", x: 63, y: 68, size: 12, travel: 16 },
  ],
};
