import { BallCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { PLAYER_MOVEMENT, PLAYER_PHYSICS } from "../characters/player/playerConfig";
import type { MCPConfig } from "../npcs/mcpData";
import type { OfficeWorld } from "../world/createOfficeMap";

interface ColliderEntry {
  key: string;
  position: [number, number, number];
  args: [number, number, number];
}

function rectToColliderEntry(
  key: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height = PLAYER_PHYSICS.obstacleHeight
): ColliderEntry {
  const halfWidth = (maxX - minX) / 2;
  const halfDepth = (maxZ - minZ) / 2;

  return {
    key,
    position: [minX + halfWidth, height * 0.5, minZ + halfDepth],
    args: [halfWidth, height * 0.5, halfDepth]
  };
}

export function OfficeColliders({ officeWorld }: { officeWorld: OfficeWorld }) {
  const colliders = useMemo(() => {
    const obstacleEntries = officeWorld.obstacles.map((obstacle, index) =>
      rectToColliderEntry(`obstacle-${index}`, obstacle.minX, obstacle.maxX, obstacle.minZ, obstacle.maxZ)
    );

    const borderThickness = 0.3;
    const bounds = officeWorld.bounds;
    const borderEntries = [
      rectToColliderEntry(
        "border-north",
        bounds.minX - borderThickness,
        bounds.maxX + borderThickness,
        bounds.minZ - borderThickness,
        bounds.minZ
      ),
      rectToColliderEntry(
        "border-south",
        bounds.minX - borderThickness,
        bounds.maxX + borderThickness,
        bounds.maxZ,
        bounds.maxZ + borderThickness
      ),
      rectToColliderEntry("border-west", bounds.minX - borderThickness, bounds.minX, bounds.minZ, bounds.maxZ),
      rectToColliderEntry("border-east", bounds.maxX, bounds.maxX + borderThickness, bounds.minZ, bounds.maxZ)
    ];

    return [...obstacleEntries, ...borderEntries];
  }, [officeWorld]);

  return (
    <RigidBody type="fixed" colliders={false}>
      {colliders.map((entry) => (
        <CuboidCollider
          key={entry.key}
          position={entry.position}
          args={entry.args}
          friction={0}
          restitution={0}
        />
      ))}
    </RigidBody>
  );
}

export function NpcInteractionSensors({ npcs }: { npcs: MCPConfig[] }) {
  return (
    <>
      {npcs.map((npc) => (
        <RigidBody
          key={`sensor-${npc.id}`}
          type="fixed"
          colliders={false}
          position={[npc.position.x, 0.8, npc.position.z]}
        >
          <BallCollider args={[npc.interactionRadius ?? PLAYER_MOVEMENT.interactionRadius]} sensor />
        </RigidBody>
      ))}
    </>
  );
}
