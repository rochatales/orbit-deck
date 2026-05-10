import type { Group } from "three";

interface RoomProps {
  object: Group;
}

export function Room({ object }: RoomProps) {
  return <primitive object={object} />;
}
