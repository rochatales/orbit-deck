import { useEffect, useState } from "react";

export function usePixelTalkCycle(active: boolean, intervalMs = 320) {
  const [talking, setTalking] = useState(active);

  useEffect(() => {
    if (!active) {
      setTalking(false);
      return;
    }

    const interval = window.setInterval(() => {
      setTalking((value) => !value);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [active, intervalMs]);

  return talking;
}
