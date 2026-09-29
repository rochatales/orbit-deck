import type { Group } from "three";

interface HolographicPanelsProps {
  object?: Group | null;
}

export function HolographicPanels({ object }: HolographicPanelsProps) {
  if (!object) {
    return null;
  }

  return <primitive object={object} />;
}
