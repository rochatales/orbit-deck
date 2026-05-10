import { CapsuleCollider, RigidBody, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import type { MutableRefObject, PropsWithChildren } from "react";
import { PLAYER_COLLIDER_HALF_HEIGHT, PLAYER_MOVEMENT } from "../characters/player/playerConfig";

interface PlayerPhysicsBodyProps extends PropsWithChildren {
  rigidBodyRef: MutableRefObject<RapierRigidBody | null>;
  colliderRef: MutableRefObject<RapierCollider | null>;
  position: [number, number, number];
}

export function PlayerPhysicsBody({ rigidBodyRef, colliderRef, position, children }: PlayerPhysicsBodyProps) {
  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders={false}
      canSleep={false}
      friction={0}
      position={position}
    >
      {/* Keep gameplay collision on a simple invisible capsule so GLB art stays visual-only. */}
      <CapsuleCollider
        ref={colliderRef}
        args={[PLAYER_COLLIDER_HALF_HEIGHT, PLAYER_MOVEMENT.colliderRadius]}
        friction={0}
        restitution={0}
      />
      {children}
    </RigidBody>
  );
}
