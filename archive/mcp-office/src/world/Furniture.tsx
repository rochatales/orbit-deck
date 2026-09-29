import type { Group } from "three";

interface FurnitureProps {
  object?: Group | null;
}

export function Furniture({ object }: FurnitureProps) {
  if (!object) {
    return null;
  }

  return <primitive object={object} />;
}
