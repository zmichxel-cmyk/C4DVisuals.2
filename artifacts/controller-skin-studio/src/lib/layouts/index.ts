import { c4d1Layout } from "./c4d1";
import { c4d4Layout } from "./c4d4";
import { c4d5Layout } from "./c4d5";
import { c4d1EdgeLayout } from "./c4d1Edge";
import { c4d5EdgeLayout } from "./c4d5Edge";
import { ControllerLayout } from "../controllerLayout";

export type ControllerType = "c4d1" | "c4d4" | "c4d5" | "c4d1-edge" | "c4d5-edge";

export const LAYOUTS: Record<ControllerType, ControllerLayout> = {
  "c4d1":      c4d1Layout,
  "c4d4":      c4d4Layout,
  "c4d5":      c4d5Layout,
  "c4d1-edge": c4d1EdgeLayout,
  "c4d5-edge": c4d5EdgeLayout,
};

export const CONTROLLER_TYPES: { id: ControllerType; label: string }[] = [
  { id: "c4d1",      label: "C4D.1" },
  { id: "c4d4",      label: "C4D.4" },
  { id: "c4d5",      label: "C4D.5" },
  { id: "c4d1-edge", label: "C4D.1 Edge" },
  { id: "c4d5-edge", label: "C4D.5 Edge" },
];
