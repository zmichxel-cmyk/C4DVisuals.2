import { ControllerType } from "../lib/layouts";

export type { ControllerType };

export interface ControllerConfig {
  controllerType: ControllerType;
  overlayName: string;
  controllerSkin: string | null;
  leftStickSkin: string | null;
  rightStickSkin: string | null;
  controllerSkinLoop: boolean;
  controllerSkinVideoFit: "contain" | "cover";
  controllerSkinContrast: number;
  controllerSkinSaturate: number;
  // Logo overlay — composited on top of the skin in the preview and OBS export.
  // Allows an animated WebM skin and a static logo to coexist.
  controllerSkinLogoOverlay: {
    url: string; x: number; y: number; w: number; h: number;
    rot: number; opacity: number; blendMode: string;
    canvasW: number; canvasH: number;
  } | null;
  showWatermark: boolean;
  showShadow: boolean;
  shadowIntensity: number; // 0-1
  shadowAngle: number;     // 0-360 degrees
  buttonColor: string;
  buttonOpacity: number;
  usePerButtonColors: boolean;
  glowEnabled: boolean;
  glowSize: number;
  innerFade: boolean;
  outerFade: boolean;
  strokeEnabled: boolean;
  strokeWidth: number;
  strokeColor: string;
  stickTravel: number;
  width: number;
  height: number;
  leftStickColor: string;
  rightStickColor: string;
  linkStickColors: boolean;
  stickGlowEnabled: boolean;
  stickGlowSize: number;
  stickOpacity: number;
  bodyEffect: "none" | "pulseGlow" | "particles" | "fire";
  bodyEffectSpeed: number;
  bodyEffectIntensity: number;
  pulseGlowColor: string;
  fireColor1: string;
  fireGlowSpeed: number;
  fireEmberSpeed: number;
  fireColor2: string;
  rgbBodyEnabled: boolean;
  rgbBodySpeed: number;
  rgbBodyMode: "wave" | "breathing";
  rgbBodyIntensity: number;
  rgbBodyWaveColor: string;
  rgbBodyWaveRainbow: boolean;
  rgbBodyBreathingColor: string;
  rgbBodyBreathingRainbow: boolean;
}

export const DEFAULT_CONFIG: ControllerConfig = {
  controllerType: "xbox-one",
  overlayName: "My Controller",
  controllerSkin: "/skins/xbox-one-base.png",
  leftStickSkin: "/sticks/xbox-left.png",
  rightStickSkin: "/sticks/xbox-right.png",
  controllerSkinLoop: true,
  controllerSkinVideoFit: "contain",
  controllerSkinContrast: 1,
  controllerSkinSaturate: 1,
  controllerSkinLogoOverlay: null,
  showWatermark: true,
  showShadow: true,
  shadowIntensity: 0.9,
  shadowAngle: 180,
  buttonColor: "#ffffff",
  buttonOpacity: 0.65,
  usePerButtonColors: false,
  glowEnabled: true,
  glowSize: 14,
  innerFade: false,
  outerFade: false,
  strokeEnabled: true,
  strokeWidth: 2,
  strokeColor: "#ffffff",
  stickTravel: 40,
  width: 1280,
  height: 1024,
  leftStickColor: "#e40707",
  rightStickColor: "#e40707",
  linkStickColors: true,
  stickGlowEnabled: false,
  stickGlowSize: 8,
  stickOpacity: 1,
  bodyEffect: "none",
  bodyEffectSpeed: 6,
  bodyEffectIntensity: 0.5,
  pulseGlowColor: "#7b2ff7",
  fireColor1: "#ff2200",
  fireGlowSpeed: 4,
  fireEmberSpeed: 6,
  fireColor2: "#ff8800",
  rgbBodyEnabled: false,
  rgbBodySpeed: 6,
  rgbBodyMode: "wave",
  rgbBodyIntensity: 1,
  rgbBodyWaveColor: "#e40707",
  rgbBodyWaveRainbow: true,
  rgbBodyBreathingColor: "#e40707",
  rgbBodyBreathingRainbow: true,
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
