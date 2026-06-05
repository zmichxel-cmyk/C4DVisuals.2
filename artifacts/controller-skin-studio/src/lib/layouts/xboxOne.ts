import { ControllerLayout } from "../controllerLayout";

export const xboxOneLayout: ControllerLayout = {
  name: "Xbox One",
  connectMessage: "Connect Xbox Controller",
  defaultSkinUrl: "/skins/xbox-one-base.png",
  defaultLeftStickUrl: "/sticks/xbox-left.png",
  defaultRightStickUrl: "/sticks/xbox-right.png",
  defaultWidth: 1024,
  defaultHeight: 1024,

  buttonColors: {
    0:  "#22c55e", // A - green
    1:  "#ef4444", // B - red
    2:  "#3b82f6", // X - blue
    3:  "#eab308", // Y - yellow
    4:  "#06b6d4", // LB
    5:  "#06b6d4", // RB
    6:  "#f97316", // LT
    7:  "#f97316", // RT
    8:  "#94a3b8", // View
    9:  "#94a3b8", // Menu
    10: "#8b5cf6", // LS
    11: "#8b5cf6", // RS
    12: "#e2e8f0", // D-up
    13: "#e2e8f0", // D-down
    14: "#e2e8f0", // D-left
    15: "#e2e8f0", // D-right
    16: "#f59e0b", // Xbox home
    17: "#94a3b8", // Share
  },

  // Each entry: url = extracted mask PNG, cx/cy = button center in % of template image size
  buttonMasks: {
    0:  { url: "/masks/xbox-btn-11.png", cx: 74.9, cy: 52.7 },
    1:  { url: "/masks/xbox-btn-8.png",  cx: 81.4, cy: 44.7 },
    2:  { url: "/masks/xbox-btn-7.png",  cx: 68.4, cy: 44.6 },
    3:  { url: "/masks/xbox-btn-5.png",  cx: 74.9, cy: 36.7 },
    4:  { url: "/masks/xbox-btn-2.png",  cx: 26.6, cy: 24.6 },
    5:  { url: "/masks/xbox-btn-3.png",  cx: 74.1, cy: 24.5 },
    6:  { url: "/masks/xbox-btn-0.png",  cx: 28.7, cy: 10.9 },
    7:  { url: "/masks/xbox-btn-1.png",  cx: 72.2, cy: 10.8 },
    8:  { url: "/masks/xbox-btn-9.png",  cx: 43.5, cy: 44.6 },
    9:  { url: "/masks/xbox-btn-10.png", cx: 57.3, cy: 44.6 },
    10: { url: "/masks/xbox-btn-6.png",  cx: 25.9, cy: 44.5 },
    11: { url: "/masks/xbox-btn-14.png", cx: 62.8, cy: 62.6 },
    12: { url: "/masks/xbox-btn-13.png", cx: 38.0, cy: 58.8 },
    13: { url: "/masks/xbox-btn-17.png", cx: 37.9, cy: 69.0 },
    14: { url: "/masks/xbox-btn-15.png", cx: 33.8, cy: 63.8 },
    15: { url: "/masks/xbox-btn-16.png", cx: 42.1, cy: 64.0 },
    16: { url: "/masks/xbox-btn-4.png",  cx: 50.4, cy: 31.9 },
    17: { url: "/masks/xbox-btn-12.png", cx: 50.4, cy: 51.5 },
  },

  buttons: [
    { index: 0,  label: "A",     x: 73,   y: 53,   size: 5.5, shape: "circle" },
    { index: 1,  label: "B",     x: 81,   y: 46,   size: 5.5, shape: "circle" },
    { index: 2,  label: "X",     x: 65,   y: 46,   size: 5.5, shape: "circle" },
    { index: 3,  label: "Y",     x: 73,   y: 39,   size: 5.5, shape: "circle" },
    { index: 4,  label: "LB",    x: 23,   y: 27,   size: 11,  shape: "pill-h" },
    { index: 5,  label: "RB",    x: 74,   y: 27,   size: 11,  shape: "pill-h" },
    { index: 6,  label: "LT",    x: 22,   y: 13,   size: 12,  shape: "pill-h" },
    { index: 7,  label: "RT",    x: 76,   y: 13,   size: 12,  shape: "pill-h" },
    { index: 8,  label: "View",  x: 40,   y: 44,   size: 4.5, shape: "circle" },
    { index: 9,  label: "Menu",  x: 57,   y: 44,   size: 4.5, shape: "circle" },
    { index: 10, label: "LS",    x: 33,   y: 47,   size: 4.5, shape: "circle" },
    { index: 11, label: "RS",    x: 62,   y: 67,   size: 4.5, shape: "circle" },
    { index: 12, label: "↑",     x: 26,   y: 59,   size: 4,   shape: "cross-up"    },
    { index: 13, label: "↓",     x: 26,   y: 75,   size: 4,   shape: "cross-down"  },
    { index: 14, label: "←",     x: 18,   y: 67,   size: 4,   shape: "cross-left"  },
    { index: 15, label: "→",     x: 34,   y: 67,   size: 4,   shape: "cross-right" },
    { index: 16, label: "⊙",     x: 49,   y: 32,   size: 8,   shape: "circle" },
    { index: 17, label: "Share", x: 49,   y: 52,   size: 4,   shape: "circle" },
  ],
  sticks: [
    { axisX: 0, axisY: 1, label: "LS", x: 33, y: 47, size: 13, travel: 16 },
    { axisX: 2, axisY: 3, label: "RS", x: 62, y: 67, size: 13, travel: 16 },
  ],
};
