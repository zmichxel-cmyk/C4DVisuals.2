import { useEffect, useRef, useState } from "react";

// Native <input type="color"> fires onChange continuously while dragging —
// often faster than the app can afford to re-render, since every call
// cascades into a setConfig-style update that re-renders a large chunk of
// the tree. This keeps the swatch/hex label instantly responsive off local
// state, while the expensive upstream `onChange` is coalesced to at most
// once per animation frame instead of once per native event.
export function useThrottledColor(value: string, onChange: (v: string) => void): [string, (v: string) => void] {
  const [local, setLocal] = useState(value);
  const latestRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => { setLocal(value); latestRef.current = value; }, [value]);
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  function handleChange(v: string) {
    setLocal(v);
    latestRef.current = v;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        onChangeRef.current(latestRef.current);
      });
    }
  }

  return [local, handleChange];
}
