import { ControllerType } from "../lib/layouts";

export type { ControllerType };

export interface ControllerConfig {
  controllerType: ControllerType;
  overlayName: string;
  controllerSkin: string | null;
  leftStickSkin: string | null;
  rightStickSkin: string | null;
  buttonColor: string;
  buttonOpacity: number;
  usePerButtonColors: boolean;
  glowEnabled: boolean;
  glowSize: number;
  innerFade: boolean;
  stickTravel: number;
  width: number;
  height: number;
}

export const DEFAULT_CONFIG: ControllerConfig = {
  controllerType: "xbox-one",
  overlayName: "My Controller",
  controllerSkin: "/skins/xbox-one-base.png",
  leftStickSkin: "/sticks/xbox-left.png",
  rightStickSkin: "/sticks/xbox-right.png",
  buttonColor: "#ffffff",
  buttonOpacity: 0.65,
  usePerButtonColors: false,
  glowEnabled: true,
  glowSize: 14,
  innerFade: false,
  stickTravel: 16,
  width: 1024,
  height: 1024,
};

export interface ButtonOverride {
  x: number;
  y: number;
  size: number;
}

export interface StickOverride {
  x: number;
  y: number;
  size: number;
}

export interface LayoutOverrides {
  buttons: Record<number, Partial<ButtonOverride>>;
  sticks: Record<number, Partial<StickOverride>>;
}

export const DEFAULT_OVERRIDES: LayoutOverrides = {
  buttons: {},
  sticks: {},
};
