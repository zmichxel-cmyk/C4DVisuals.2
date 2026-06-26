import { ControllerLayout } from "../controllerLayout";

export const c4d1EdgeLayout: ControllerLayout = {
  name: "C4D.1 Edge",
  connectMessage: "Connect C4D.1 Edge Controller",
  defaultSkinUrl: "skins/c4d1-edge-base.png",
  bodyMaskUrl: "skins/c4d1-edge-body-mask.png",
  defaultLeftStickUrl: "sticks/c4d-edge-stick.png",
  defaultRightStickUrl: "sticks/c4d-edge-stick.png",
  defaultWidth: 1024,
  defaultHeight: 1024,
  skinWidth: 1352,
  skinHeight: 1080,

  buttonColors: {
    0:  "#22c55e", // A
    1:  "#ef4444", // B
    2:  "#3b82f6", // X
    3:  "#eab308", // Y
    4:  "#06b6d4", // LB
    5:  "#06b6d4", // RB
    6:  "#f97316", // LT
    7:  "#f97316", // RT
    8:  "#94a3b8", // View
    9:  "#94a3b8", // Menu
    10: "#8b5cf6", // LS
    11: "#8b5cf6", // RS
    12: "#e2e8f0",
    13: "#e2e8f0",
    14: "#e2e8f0",
    15: "#e2e8f0",
    16: "#f59e0b", // Home
    17: "#94a3b8", // Share
    19: "#10b981", // Paddle LP1
    20: "#10b981", // Paddle LP2
    21: "#10b981", // Paddle RP1
    22: "#10b981", // Paddle RP2
  },

  buttonMasks: {
    0:  { url: "masks-cropped/edge/c4d1e-action1.png",  cx: 74.98, cy: 52.82, sw: 6.81, sh: 8.61 },
    1:  { url: "masks-cropped/edge/c4d1e-action2.png",  cx: 81.49, cy: 44.81, sw: 6.81, sh: 8.7  },
    2:  { url: "masks-cropped/edge/c4d1e-action3.png",  cx: 68.47, cy: 44.72, sw: 6.81, sh: 8.7  },
    3:  { url: "masks-cropped/edge/c4d1e-action4.png",  cx: 74.98, cy: 36.76, sw: 6.81, sh: 8.7  },
    4:  { url: "masks-cropped/edge/c4d1e-left-bumper.png",  cx: 26.81, cy: 26.11, sw: 21.32, sh: 9.63 },
    5:  { url: "masks-cropped/edge/c4d1e-right-bumper.png", cx: 74.08, cy: 26.06, sw: 21.32, sh: 9.72 },
    6:  { url: "masks-cropped/edge/c4d1e-left-trigger.png",  cx: 28.16, cy: 10.32, sw: 12.04, sh: 16.62 },
    7:  { url: "masks-cropped/edge/c4d1e-right-trigger.png", cx: 72.7,  cy: 10.37, sw: 11.97, sh: 16.53 },
    8:  { url: "masks-cropped/edge/c4d1e-view.png",  cx: 43.49, cy: 44.68, sw: 4.41, sh: 5.65 },
    9:  { url: "masks-cropped/edge/c4d1e-menu.png",  cx: 57.4,  cy: 44.68, sw: 4.41, sh: 5.65 },
    10: { url: "masks-cropped/xbox-btn-6.png",       cx: 25.99, cy: 44.58, sw: 10.99, sh: 13.61 },
    11: { url: "masks-cropped/xbox-btn-14.png",      cx: 62.86, cy: 62.73, sw: 10.7,  sh: 13.24 },
    12: { url: "masks-cropped/edge/c4d1e-dpad-up.png",    cx: 38.0,  cy: 59.35, sw: 4.79, sh: 8.15 },
    13: { url: "masks-cropped/edge/c4d1e-dpad-down.png",  cx: 37.96, cy: 68.56, sw: 4.71, sh: 8.06 },
    14: { url: "masks-cropped/edge/c4d1e-dpad-left.png",  cx: 34.18, cy: 63.89, sw: 6.58, sh: 5.93 },
    15: { url: "masks-cropped/edge/c4d1e-dpad-right.png", cx: 41.81, cy: 64.03, sw: 6.43, sh: 5.83 },
    16: { url: "masks-cropped/edge/c4d1e-home.png",  cx: 50.45, cy: 31.94, sw: 8.15, sh: 10.37 },
    17: { url: "masks-cropped/edge/c4d1e-share.png", cx: 50.37, cy: 51.57, sw: 5.31, sh: 3.89 },
    19: { url: "masks-cropped/edge/c4d1e-left-paddle.png",  cx: 14, cy: 70, sw: 7,   sh: 9.17 },
    20: { url: "masks-cropped/edge/c4d1e-left-paddle1.png", cx: 22, cy: 72, sw: 4.7, sh: 5.38 },
    21: { url: "masks-cropped/edge/c4d1e-right-paddle.png",  cx: 86, cy: 70, sw: 7,   sh: 9.17 },
    22: { url: "masks-cropped/edge/c4d1e-right-paddle1.png", cx: 78, cy: 72, sw: 4.7, sh: 5.38 },
  },

  buttons: [
    { index: 0,  label: "A",     x: 73,  y: 53,  size: 5.5, shape: "circle" },
    { index: 1,  label: "B",     x: 81,  y: 46,  size: 5.5, shape: "circle" },
    { index: 2,  label: "X",     x: 65,  y: 46,  size: 5.5, shape: "circle" },
    { index: 3,  label: "Y",     x: 73,  y: 39,  size: 5.5, shape: "circle" },
    { index: 4,  label: "LB",   x: 23,  y: 27,  size: 11,  shape: "pill-h" },
    { index: 5,  label: "RB",   x: 74,  y: 27,  size: 11,  shape: "pill-h" },
    { index: 6,  label: "LT",   x: 22,  y: 13,  size: 12,  shape: "pill-h" },
    { index: 7,  label: "RT",   x: 76,  y: 13,  size: 12,  shape: "pill-h" },
    { index: 8,  label: "View", x: 40,  y: 44,  size: 4.5, shape: "circle" },
    { index: 9,  label: "Menu", x: 57,  y: 44,  size: 4.5, shape: "circle" },
    { index: 12, label: "↑",    x: 26,  y: 59,  size: 4,   shape: "cross-up"    },
    { index: 13, label: "↓",    x: 26,  y: 75,  size: 4,   shape: "cross-down"  },
    { index: 14, label: "←",    x: 18,  y: 67,  size: 4,   shape: "cross-left"  },
    { index: 15, label: "→",    x: 34,  y: 67,  size: 4,   shape: "cross-right" },
    { index: 16, label: "⊙",    x: 49,  y: 32,  size: 8,   shape: "circle" },
    { index: 17, label: "Share",x: 49,  y: 52,  size: 4,   shape: "circle" },
    { index: 19, label: "P1",   x: 14,  y: 70,  size: 7,   shape: "rect" },
    { index: 20, label: "P2",   x: 22,  y: 72,  size: 4.7, shape: "rect" },
    { index: 21, label: "P3",   x: 86,  y: 70,  size: 7,   shape: "rect" },
    { index: 22, label: "P4",   x: 78,  y: 72,  size: 4.7, shape: "rect" },
  ],
  sticks: [
    { axisX: 0, axisY: 1, label: "LS", x: 33, y: 47, size: 13, travel: 16, pressBtn: 10 },
    { axisX: 2, axisY: 3, label: "RS", x: 62, y: 67, size: 13, travel: 16, pressBtn: 11 },
  ],
};
