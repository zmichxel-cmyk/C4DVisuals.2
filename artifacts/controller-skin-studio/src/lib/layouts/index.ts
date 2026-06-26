import { xboxOneLayout } from "./xboxOne";
import { ps4Layout } from "./ps4";
import { ps5Layout } from "./ps5";
import { c4d1EdgeLayout } from "./c4d1Edge";
import { c4d5EdgeLayout } from "./c4d5Edge";
import { ControllerLayout } from "../controllerLayout";

export type ControllerType = "xbox-one" | "ps4" | "ps5" | "c4d1-edge" | "c4d5-edge";

export const LAYOUTS: Record<ControllerType, ControllerLayout> = {
  "xbox-one":  xboxOneLayout,
  "ps4":       ps4Layout,
  "ps5":       ps5Layout,
  "c4d1-edge": c4d1EdgeLayout,
  "c4d5-edge": c4d5EdgeLayout,
};

export const CONTROLLER_TYPES: { id: ControllerType; label: string }[] = [
  { id: "xbox-one",  label: "C4D.1" },
  { id: "ps4",       label: "C4D.4" },
  { id: "ps5",       label: "C4D.5" },
  { id: "c4d1-edge", label: "C4D.1 Edge" },
  { id: "c4d5-edge", label: "C4D.5 Edge" },
];
