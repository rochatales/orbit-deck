import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OfficeWorld } from "./createOfficeMap";
import { useGameStore } from "../state/useGameStore";
import { Room } from "./Room";

interface OfficeMapProps {
  officeWorld: OfficeWorld;
}

export function OfficeMap({ officeWorld }: OfficeMapProps) {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const worldVector = new Vector3();

  useFrame((_, delta) => {
    worldVector.set(playerPosition.x, playerPosition.y, playerPosition.z);
    officeWorld.update(worldVector, delta);
  });

  return <Room object={officeWorld.group} />;
}
