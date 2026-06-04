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
  buttons: new Array(17).fill(false),
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

    // LT / RT may come as axes (2 / 5 for some controllers) or buttons (6 / 7)
    const ltAxis = applyDeadzone((gp.axes[2] ?? -1 + 1) / 2);
    const rtAxis = applyDeadzone((gp.axes[5] ?? -1 + 1) / 2);
    const ltButton = gp.buttons[6]?.value ?? 0;
    const rtButton = gp.buttons[7]?.value ?? 0;

    setState({
      connected: true,
      id: gp.id,
      buttons,
      axes: [
        applyDeadzone(gp.axes[0] ?? 0),
        applyDeadzone(gp.axes[1] ?? 0),
        applyDeadzone(gp.axes[2] ?? 0),
        applyDeadzone(gp.axes[3] ?? 0),
      ],
      triggers: [Math.max(ltAxis, ltButton), Math.max(rtAxis, rtButton)],
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
