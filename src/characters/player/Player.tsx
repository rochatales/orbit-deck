import type { RapierCollider, RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { PlayerPhysicsBody } from "../../physics/PlayerPhysicsBody";
import type { OfficeWorld } from "../../world/createOfficeMap";
import { PLAYER_SPAWN } from "../../world/mapConfig";
import { PlayerController } from "./PlayerController";
import { PlayerModel } from "./PlayerModel";
import {
  createInitialPlayerMotionState,
  PLAYER_COLLIDER_CENTER_Y
} from "./playerConfig";

interface PlayerProps {
  officeWorld: OfficeWorld;
}

export function Player({ officeWorld }: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody | null>(null);
  const colliderRef = useRef<RapierCollider | null>(null);
  const motionRef = useRef(createInitialPlayerMotionState());

  return (
    <>
      <PlayerPhysicsBody
        rigidBodyRef={rigidBodyRef}
        colliderRef={colliderRef}
        position={[PLAYER_SPAWN.x, PLAYER_COLLIDER_CENTER_Y, PLAYER_SPAWN.z]}
      >
        <PlayerModel motionRef={motionRef} />
      </PlayerPhysicsBody>

      <PlayerController
        rigidBodyRef={rigidBodyRef}
        colliderRef={colliderRef}
        officeWorld={officeWorld}
        motionRef={motionRef}
      />
    </>
  );
}
