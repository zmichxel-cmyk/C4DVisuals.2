import { xboxOneLayout } from "./xboxOne";
import { ps4Layout } from "./ps4";
import { ps5Layout } from "./ps5";
import { ControllerLayout } from "../controllerLayout";

export type ControllerType = "xbox-one" | "ps4" | "ps5";

export const LAYOUTS: Record<ControllerType, ControllerLayout> = {
  "xbox-one": xboxOneLayout,
  "ps4": ps4Layout,
  "ps5": ps5Layout,
};

export const CONTROLLER_TYPES: { id: ControllerType; label: string }[] = [
  { id: "xbox-one", label: "Xbox One" },
  { id: "ps4",      label: "PS4" },
  { id: "ps5",      label: "PS5" },
];
