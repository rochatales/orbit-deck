import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MathUtils, Quaternion, Vector2, Vector3 } from "three";
import { GameControl } from "../../controls/keyboardControls";
import { MCP_NPCS } from "../../npcs/mcpData";
import { useDialogueStore } from "../../state/useDialogueStore";
import { useGameStore } from "../../state/useGameStore";
import { useWorkflowStore } from "../../state/useWorkflowStore";
import { clamp, damp, dampAngle, type RectBounds } from "../../utils/math";
import type { OfficeWorld } from "../../world/createOfficeMap";
import {
  PLAYER_COLLIDER_CENTER_Y,
  PLAYER_MOVEMENT,
  PLAYER_PHYSICS,
  type PlayerMotionState
} from "./playerConfig";
import { PLAYER_ANIMATION } from "./playerAnimationConfig";

interface PlayerControllerProps {
  rigidBodyRef: MutableRefObject<RapierRigidBody | null>;
  colliderRef: MutableRefObject<RapierCollider | null>;
  officeWorld: OfficeWorld;
  motionRef: MutableRefObject<PlayerMotionState>;
}

function lerpAngle(current: number, target: number, alpha: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * alpha;
}

function fitsWalkableAreas(x: number, z: number, walkableAreas: RectBounds[], radius: number) {
  if (walkableAreas.length === 0) {
    return true;
  }

  // Treat the tile footprint as the true walkable shape and let Rapier colliders
  // handle wall/door tightness, otherwise adjacent patches create dead zones.
  return walkableAreas.some((area) => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ);
}

function constrainToWalkableAreas(
  currentX: number,
  currentZ: number,
  desiredX: number,
  desiredZ: number,
  bounds: RectBounds,
  walkableAreas: RectBounds[],
  radius: number
) {
  const clampedTargetX = clamp(currentX + desiredX, bounds.minX + radius, bounds.maxX - radius);
  const clampedTargetZ = clamp(currentZ + desiredZ, bounds.minZ + radius, bounds.maxZ - radius);
  const combinedDeltaX = clampedTargetX - currentX;
  const combinedDeltaZ = clampedTargetZ - currentZ;

  if (fitsWalkableAreas(clampedTargetX, clampedTargetZ, walkableAreas, radius)) {
    return { x: combinedDeltaX, z: combinedDeltaZ };
  }

  let allowedX = 0;
  let allowedZ = 0;

  if (fitsWalkableAreas(clampedTargetX, currentZ, walkableAreas, radius)) {
    allowedX = combinedDeltaX;
  }

  const zTarget = clamp(currentZ + desiredZ, bounds.minZ + radius, bounds.maxZ - radius);
  const xBase = currentX + allowedX;
  if (fitsWalkableAreas(xBase, zTarget, walkableAreas, radius)) {
    allowedZ = zTarget - currentZ;
  }

  return { x: allowedX, z: allowedZ };
}

function getInteractionFacingAngle(x: number, z: number, activeNpcId: string | null) {
  const npc = MCP_NPCS.find((entry) => entry.id === activeNpcId);
  if (!npc) {
    return null;
  }

  return Math.atan2(npc.position.x - x, npc.position.z - z);
}

export function PlayerController({
  rigidBodyRef,
  colliderRef,
  officeWorld,
  motionRef
}: PlayerControllerProps) {
  const camera = useThree((state) => state.camera);
  const { world } = useRapier();
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const isPaused = useGameStore((state) => state.isPaused);
  const isDialogOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const activeActionCount = useWorkflowStore((state) => state.activeActionKeys.length);
  const [, getKeys] = useKeyboardControls<GameControl>();
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const inputRef = useRef(new Vector2());
  const targetInputRef = useRef(new Vector2());
  const velocityRef = useRef(new Vector3());
  const movementRef = useRef(new Vector3());
  const moveForward = useRef(new Vector3());
  const moveRight = useRef(new Vector3());
  const upAxis = useMemo(() => new Vector3(0, 1, 0), []);
  const facingAngleRef = useRef(0);
  const rotationQuaternion = useRef(new Quaternion());
  const previousActionCount = useRef(0);

  useEffect(() => {
    const controller = world.createCharacterController(PLAYER_PHYSICS.controllerOffset);
    controller.setApplyImpulsesToDynamicBodies(false);
    controller.enableAutostep(PLAYER_PHYSICS.autostepMaxHeight, PLAYER_PHYSICS.autostepMinWidth, false);
    controller.enableSnapToGround(PLAYER_PHYSICS.snapToGroundDistance);
    controller.setMaxSlopeClimbAngle(Math.PI * 0.34);
    controller.setMinSlopeSlideAngle(Math.PI * 0.45);
    controllerRef.current = controller;

    return () => {
      controller.free();
      controllerRef.current = null;
    };
  }, [world]);

  useEffect(() => {
    if (activeActionCount > previousActionCount.current) {
      motionRef.current.actionTriggerUntil = performance.now() * 0.001 + PLAYER_ANIMATION.actionTriggerDuration;
    }
    previousActionCount.current = activeActionCount;
  }, [activeActionCount, motionRef]);

  useBeforePhysicsStep((stepWorld) => {
    const body = rigidBodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    if (!body || !collider || !controller) {
      return;
    }

    const dt = stepWorld.integrationParameters.dt;
    const translation = body.translation();
    const enabled = !isPaused && !isDialogOpen;
    const keys = getKeys();
    targetInputRef.current.set(
      (keys[GameControl.Rightward] ? 1 : 0) - (keys[GameControl.Leftward] ? 1 : 0),
      (keys[GameControl.Forward] ? 1 : 0) - (keys[GameControl.Backward] ? 1 : 0)
    );
    inputRef.current.lerp(targetInputRef.current, MathUtils.clamp(dt * 12, 0, 1));

    if (!enabled) {
      inputRef.current.lerp(new Vector2(0, 0), MathUtils.clamp(dt * 16, 0, 1));
    }

    const isRunning = enabled && keys[GameControl.Run];
    const maxMoveSpeed = PLAYER_MOVEMENT.speed * (isRunning ? PLAYER_MOVEMENT.runMultiplier : 1);
    const desiredSpeed = enabled && inputRef.current.lengthSq() > 0.001 ? maxMoveSpeed : 0;

    camera.getWorldDirection(moveForward.current);
    moveForward.current.y = 0;
    moveForward.current.normalize();
    moveRight.current.crossVectors(moveForward.current, upAxis).normalize();

    const desiredDirection = movementRef.current
      .copy(moveRight.current)
      .multiplyScalar(inputRef.current.x)
      .addScaledVector(moveForward.current, inputRef.current.y);

    if (desiredDirection.lengthSq() > 1) {
      desiredDirection.normalize();
    }

    const smoothing = desiredSpeed > 0 ? PLAYER_MOVEMENT.acceleration : PLAYER_MOVEMENT.deceleration;
    velocityRef.current.x = damp(velocityRef.current.x, desiredDirection.x * desiredSpeed, smoothing, dt);
    velocityRef.current.z = damp(velocityRef.current.z, desiredDirection.z * desiredSpeed, smoothing, dt);

    const planarSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);
    const speedAlpha = MathUtils.clamp(planarSpeed / (PLAYER_MOVEMENT.speed * PLAYER_MOVEMENT.runMultiplier), 0, 1);
    const desiredTranslation = constrainToWalkableAreas(
      translation.x,
      translation.z,
      velocityRef.current.x * dt,
      velocityRef.current.z * dt,
      officeWorld.bounds,
      officeWorld.walkableAreas,
      PLAYER_MOVEMENT.colliderRadius
    );

    controller.computeColliderMovement(
      collider,
      {
        x: desiredTranslation.x,
        y: 0,
        z: desiredTranslation.z
      },
      undefined,
      undefined,
      (candidate) => !candidate.isSensor()
    );

    const correctedMovement = controller.computedMovement();
    body.setNextKinematicTranslation({
      x: translation.x + correctedMovement.x,
      y: PLAYER_COLLIDER_CENTER_Y,
      z: translation.z + correctedMovement.z
    });

    const interactionAngle = isDialogOpen ? getInteractionFacingAngle(translation.x, translation.z, activeNpcId) : null;
    const moveAngle = planarSpeed > 0.001 ? Math.atan2(velocityRef.current.x, velocityRef.current.z) : facingAngleRef.current;
    const targetAngle = interactionAngle ?? moveAngle;
    const rotationAlpha = 1 - Math.pow(1 - PLAYER_MOVEMENT.rotationLerp, dt * 60);
    facingAngleRef.current =
      planarSpeed > 0.001 || interactionAngle !== null
        ? lerpAngle(facingAngleRef.current, targetAngle, rotationAlpha)
        : dampAngle(facingAngleRef.current, targetAngle, 10, dt);

    rotationQuaternion.current.setFromAxisAngle(upAxis, facingAngleRef.current);
    body.setNextKinematicRotation(rotationQuaternion.current);

    const now = performance.now() * 0.001;
    motionRef.current.animationState =
      isDialogOpen && now < motionRef.current.actionTriggerUntil
        ? "actionTriggered"
        : isDialogOpen
          ? "interacting"
          : speedAlpha > 0.08
            ? "walking"
            : "idle";
    motionRef.current.speedAlpha = speedAlpha;
    motionRef.current.planarSpeed = planarSpeed;
    motionRef.current.moveAngle = moveAngle;
    motionRef.current.facingAngle = facingAngleRef.current;
    motionRef.current.isGrounded = controller.computedGrounded();
  });

  useFrame(() => {
    const body = rigidBodyRef.current;
    if (!body) {
      return;
    }

    const translation = body.translation();
    setPlayerPosition({
      x: translation.x,
      y: motionRef.current.visualBob,
      z: translation.z
    });
  });

  return null;
}
