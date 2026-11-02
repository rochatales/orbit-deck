import { CuboidCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import { PLAYER_PHYSICS } from "../characters/player/playerConfig";
import type { OfficeWorld, SimpleCuboid } from "../world/createOfficeMap";

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
    const obstacleEntries = officeWorld.obstacles.filter(o => o.physics !== false).map((obstacle, index) =>
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
    <>
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
        {officeWorld.simpleCuboids?.map(c => <CuboidCollider key={c.id}
          position={[c.position.x, c.position.y, c.position.z]}
          quaternion={[c.rotation.x, c.rotation.y, c.rotation.z, c.rotation.w]}
          args={[c.halfExtents[0], c.halfExtents[1], c.halfExtents[2]]} friction={0} restitution={0}/>)}
      </RigidBody>
      {officeWorld.movingCuboids?.map(c => <MovingCollider key={c.id} entry={c}/>)}
    </>
  );
}

function MovingCollider({ entry }: { entry: SimpleCuboid }) {
  const body = useRef<RapierRigidBody>(null);
  useBeforePhysicsStep(() => { body.current?.setNextKinematicTranslation(entry.position); });
  return <RigidBody ref={body} type="kinematicPosition" colliders={false}
    position={[entry.position.x, entry.position.y, entry.position.z]}
    quaternion={[entry.rotation.x, entry.rotation.y, entry.rotation.z, entry.rotation.w]}>
    <CuboidCollider args={[entry.halfExtents[0], entry.halfExtents[1], entry.halfExtents[2]]} friction={0} restitution={0}/>
  </RigidBody>;
}
