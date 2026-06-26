import { useEffect, useRef, useState, useCallback } from "react";

export interface GamepadState {
  connected: boolean;
  id: string;
  buttons: boolean[];
  axes: number[];
  triggers: number[]; // LT, RT as 0-1 values
}

const DEAD_ZONE = 0.08;

function applyDeadzone(value: number): number {
  return Math.abs(value) < DEAD_ZONE ? 0 : value;
}

const DEFAULT_STATE: GamepadState = {
  connected: false,
  id: "",
  buttons: new Array(24).fill(false),
  axes: new Array(4).fill(0),
  triggers: [0, 0],
};

export function useGamepad() {
  const [state, setState] = useState<GamepadState>(DEFAULT_STATE);
  const rafRef = useRef<number | null>(null);
  const connectedRef = useRef(false);

  const poll = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0] ?? gamepads[1] ?? gamepads[2] ?? gamepads[3];

    if (!gp) {
      if (connectedRef.current) {
        connectedRef.current = false;
        setState(DEFAULT_STATE);
      }
      rafRef.current = requestAnimationFrame(poll);
      return;
    }

    connectedRef.current = true;

    const buttons = gp.buttons.map((b) => b.pressed || b.value > 0.1);

    // Standard mapping:
    // axes 0/1 = left stick X/Y
    // axes 2/3 = right stick X/Y
    // axes 4/5 = LT/RT on PS controllers (range -1 to 1, rest at -1)
    // buttons 6/7 = LT/RT analog value on Xbox/standard mapping
    // Never read axes 2/3 as triggers — that's the right stick!
    const ltFromAxis  = gp.axes[4] !== undefined ? applyDeadzone((gp.axes[4] + 1) / 2) : 0;
    const rtFromAxis  = gp.axes[5] !== undefined ? applyDeadzone((gp.axes[5] + 1) / 2) : 0;
    const ltFromBtn   = gp.buttons[6]?.value ?? 0;
    const rtFromBtn   = gp.buttons[7]?.value ?? 0;

    setState({
      connected: true,
      id: gp.id,
      buttons,
      axes: [
        applyDeadzone(gp.axes[0] ?? 0), // LS X
        applyDeadzone(gp.axes[1] ?? 0), // LS Y
        applyDeadzone(gp.axes[2] ?? 0), // RS X
        applyDeadzone(gp.axes[3] ?? 0), // RS Y
      ],
      triggers: [
        Math.max(ltFromAxis, ltFromBtn),
        Math.max(rtFromAxis, rtFromBtn),
      ],
    });

    rafRef.current = requestAnimationFrame(poll);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(poll);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [poll]);

  return state;
}
