export interface ControllerConfig {
  controllerSkin: string | null;  // base64 data URL
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
