import { ControllerLayout } from "../controllerLayout";

// PS face button colors (classic PlayStation palette)
const PS_COLORS = {
  cross:    "#3b82f6", // Cross - blue
  circle:   "#ef4444", // Circle - red
  square:   "#ec4899", // Square - pink
  triangle: "#22c55e", // Triangle - green
};

export const ps4Layout: ControllerLayout = {
  name: "PS4",
  defaultSkinUrl: "/ps4-default.png",
  defaultWidth: 1024,
  defaultHeight: 1024,
  buttonColors: {
    0:  PS_COLORS.cross,    // Cross
    1:  PS_COLORS.circle,   // Circle
    2:  PS_COLORS.square,   // Square
    3:  PS_COLORS.triangle, // Triangle
    4:  "#06b6d4", // L1
    5:  "#06b6d4", // R1
    6:  "#f97316", // L2
    7:  "#f97316", // R2
    8:  "#94a3b8", // Share
    9:  "#94a3b8", // Options
    10: "#8b5cf6", // L3
    11: "#8b5cf6", // R3
    12: "#e2e8f0", // D-up
    13: "#e2e8f0", // D-down
    14: "#e2e8f0", // D-left
    15: "#e2e8f0", // D-right
    16: "#3b82f6", // PS button - blue
    17: "#8b5cf6", // Touchpad
  },
  buttons: [
    // Face buttons (right cluster — PS layout)
    { index: 0,  label: "✕",     x: 77,   y: 50,   size: 5.5, shape: "circle" },
    { index: 1,  label: "○",     x: 84,   y: 43,   size: 5.5, shape: "circle" },
    { index: 2,  label: "□",     x: 70,   y: 43,   size: 5.5, shape: "circle" },
    { index: 3,  label: "△",     x: 77,   y: 36,   size: 5.5, shape: "circle" },
    // Bumpers
    { index: 4,  label: "L1",    x: 20,   y: 26,   size: 10,  shape: "pill-h" },
    { index: 5,  label: "R1",    x: 76,   y: 26,   size: 10,  shape: "pill-h" },
    // Triggers
    { index: 6,  label: "L2",    x: 19,   y: 11,   size: 11,  shape: "pill-h" },
    { index: 7,  label: "R2",    x: 79,   y: 11,   size: 11,  shape: "pill-h" },
    // Center buttons
    { index: 8,  label: "Share", x: 36,   y: 40,   size: 4,   shape: "circle" },
    { index: 9,  label: "Opts",  x: 60,   y: 40,   size: 4,   shape: "circle" },
    // Stick press (overlaid on stick positions)
    { index: 10, label: "L3",    x: 35,   y: 66,   size: 4.5, shape: "circle" },
    { index: 11, label: "R3",    x: 63,   y: 66,   size: 4.5, shape: "circle" },
    // D-pad (left side — PS layout: left stick upper, d-pad lower-left)
    // PS4: left stick is UPPER, d-pad is LOWER-left
    { index: 12, label: "↑",    x: 20.5, y: 41,   size: 4,   shape: "cross-up"    },
    { index: 13, label: "↓",    x: 20.5, y: 57,   size: 4,   shape: "cross-down"  },
    { index: 14, label: "←",    x: 12.5, y: 49,   size: 4,   shape: "cross-left"  },
    { index: 15, label: "→",    x: 28.5, y: 49,   size: 4,   shape: "cross-right" },
    // PS button
    { index: 16, label: "PS",   x: 48,   y: 59,   size: 6,   shape: "circle" },
    // Touchpad click (button 17)
    { index: 17, label: "TP",   x: 48,   y: 37,   size: 22,  shape: "rect" },
  ],
  sticks: [
    // PS4: left stick upper-left, right stick lower-right
    { axisX: 0, axisY: 1, label: "L3", x: 35, y: 66, size: 12, travel: 16 },
    { axisX: 2, axisY: 3, label: "R3", x: 63, y: 66, size: 12, travel: 16 },
  ],
};
