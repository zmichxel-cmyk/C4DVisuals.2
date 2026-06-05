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
    4:  "#06b6d4", // LB - cyan
    5:  "#06b6d4", // RB - cyan
    6:  "#f97316", // LT - orange
    7:  "#f97316", // RT - orange
    8:  "#94a3b8", // View
    9:  "#94a3b8", // Menu
    10: "#8b5cf6", // LS press
    11: "#8b5cf6", // RS press
    12: "#e2e8f0", // D-up
    13: "#e2e8f0", // D-down
    14: "#e2e8f0", // D-left
    15: "#e2e8f0", // D-right
    16: "#f59e0b", // Xbox home - amber
    17: "#94a3b8", // Share
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
