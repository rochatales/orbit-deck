import { useExpeditionStore } from "../../state/useExpeditionStore";
import type { RapierCollider, RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { PlayerPhysicsBody } from "../../physics/PlayerPhysicsBody";
import type { OfficeWorld } from "../../world/createOfficeMap";
import type { Point } from "../../game/config";
import { PlayerController } from "./PlayerController";
import { PlayerModel } from "./PlayerModel";
import {
  createInitialPlayerMotionState,
  PLAYER_COLLIDER_CENTER_Y
} from "./playerConfig";

interface PlayerProps {
  officeWorld: OfficeWorld;
  spawn: Point;
}

export function Player({ officeWorld, spawn }: PlayerProps) {
  const combat = useExpeditionStore(s => s.session.map === "shanghai");
  const rigidBodyRef = useRef<RapierRigidBody | null>(null);
  const colliderRef = useRef<RapierCollider | null>(null);
  const motionRef = useRef(createInitialPlayerMotionState());

  return (
    <>
      <PlayerPhysicsBody
        rigidBodyRef={rigidBodyRef}
        colliderRef={colliderRef}
        position={[spawn.x, PLAYER_COLLIDER_CENTER_Y, spawn.z]}
      >
        <PlayerModel motionRef={motionRef} />
        {combat && <group position={[0.34, 0.28, 0.42]}>
          <mesh castShadow><boxGeometry args={[0.16, 0.18, 0.7]}/><meshStandardMaterial color="#243842"/></mesh>
          <mesh position={[0,0,0.42]}><boxGeometry args={[0.08,0.08,0.22]}/><meshStandardMaterial color="#78cddd"/></mesh>
        </group>}
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
