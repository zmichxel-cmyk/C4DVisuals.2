export interface ButtonDef {
  index: number;
  label: string;
  x: number; // % of container width
  y: number; // % of container height
  size: number; // % of container width
  shape: "circle" | "pill-h" | "pill-v" | "cross-up" | "cross-down" | "cross-left" | "cross-right";
}

export interface StickDef {
  axisX: number;
  axisY: number;
  label: string;
  x: number; // % center
  y: number; // % center
  size: number; // % of container width
  travel: number; // px travel distance
}

export interface ControllerLayout {
  buttons: ButtonDef[];
  sticks: StickDef[];
}

// Standard Xbox-style controller layout
// Positions tuned for a typical Xbox One/360 skin image (landscape, ~1024x576)
export const XBOX_LAYOUT: ControllerLayout = {
  buttons: [
    // Face buttons
    { index: 0, label: "A", x: 72.5, y: 63,  size: 4.5, shape: "circle" },
    { index: 1, label: "B", x: 77.5, y: 52,  size: 4.5, shape: "circle" },
    { index: 2, label: "X", x: 67.5, y: 52,  size: 4.5, shape: "circle" },
    { index: 3, label: "Y", x: 72.5, y: 41,  size: 4.5, shape: "circle" },
    // Bumpers
    { index: 4, label: "LB", x: 23,  y: 30,  size: 9,   shape: "pill-h" },
    { index: 5, label: "RB", x: 73,  y: 30,  size: 9,   shape: "pill-h" },
    // Triggers (shown as pill)
    { index: 6, label: "LT", x: 22,  y: 19,  size: 9,   shape: "pill-h" },
    { index: 7, label: "RT", x: 74,  y: 19,  size: 9,   shape: "pill-h" },
    // Menu buttons
    { index: 8, label: "View", x: 40, y: 47, size: 3.5, shape: "circle" },
    { index: 9, label: "Menu", x: 57, y: 47, size: 3.5, shape: "circle" },
    // Stick press
    { index: 10, label: "LS", x: 33, y: 60,  size: 4,   shape: "circle" },
    { index: 11, label: "RS", x: 62, y: 71,  size: 4,   shape: "circle" },
    // D-Pad
    { index: 12, label: "↑",  x: 28.5, y: 51.5, size: 3.5, shape: "cross-up" },
    { index: 13, label: "↓",  x: 28.5, y: 62.5, size: 3.5, shape: "cross-down" },
    { index: 14, label: "←",  x: 23,   y: 57,   size: 3.5, shape: "cross-left" },
    { index: 15, label: "→",  x: 34,   y: 57,   size: 3.5, shape: "cross-right" },
    // Home
    { index: 16, label: "⊙",  x: 48.5, y: 46,  size: 5,   shape: "circle" },
  ],
  sticks: [
    { axisX: 0, axisY: 1, label: "Left Stick",  x: 33, y: 60, size: 12, travel: 18 },
    { axisX: 2, axisY: 3, label: "Right Stick", x: 62, y: 71, size: 12, travel: 18 },
  ],
};
