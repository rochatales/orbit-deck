import { Physics } from "@react-three/rapier";
import type { PropsWithChildren } from "react";
import type { MCPConfig } from "../npcs/mcpData";
import { useGameStore } from "../state/useGameStore";
import type { OfficeWorld } from "../world/createOfficeMap";
import { NpcInteractionSensors, OfficeColliders } from "./colliders";

interface PhysicsWorldProps extends PropsWithChildren {
  officeWorld: OfficeWorld;
  npcs: MCPConfig[];
}

export function PhysicsWorld({ officeWorld, npcs, children }: PhysicsWorldProps) {
  const isPaused = useGameStore((state) => state.isPaused);

  return (
    <Physics gravity={[0, 0, 0]} interpolate={false} paused={isPaused}>
      <OfficeColliders officeWorld={officeWorld} />
      <NpcInteractionSensors npcs={npcs} />
      {children}
    </Physics>
  );
}
