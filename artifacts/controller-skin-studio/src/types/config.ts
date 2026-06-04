export interface ControllerConfig {
  controllerSkin: string | null;
  leftStickSkin: string | null;
  rightStickSkin: string | null;
  buttonColor: string;
  buttonOpacity: number;
  stickTravel: number;
  width: number;
  height: number;
}

export const DEFAULT_CONFIG: ControllerConfig = {
  controllerSkin: null,
  leftStickSkin: null,
  rightStickSkin: null,
  buttonColor: "#ffffff",
  buttonOpacity: 0.6,
  stickTravel: 18,
  width: 1024,
  height: 576,
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
