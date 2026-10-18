import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import type { OfficeWorld } from "./createOfficeMap";
import { playerPosition } from "../state/playerTransient";
import { Room } from "./Room";

interface OfficeMapProps {
  officeWorld: OfficeWorld;
  animate?: boolean;
}

export function OfficeMap({ officeWorld, animate = true }: OfficeMapProps) {
  // Lê a posição mutável por frame: o mapa não re-renderiza quando o player anda.
  const worldVector = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (!animate) return;
    worldVector.set(playerPosition.x, playerPosition.y, playerPosition.z);
    officeWorld.update(worldVector, delta);
  });

  return <Room object={officeWorld.group} />;
}
