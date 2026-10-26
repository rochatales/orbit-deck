import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MathUtils, Quaternion, Vector3 } from "three";
import { aimInput, aimMotion, dampFacing, locomotionKind, updateAimAngle, type LocomotionKind } from "./aimMovement";
import { combatRuntime } from "../../state/useCombatStore";
import { simulationBlocked } from "../../game/simulationGate";
import { GameControl } from "../../controls/keyboardControls";
import { EDEN } from "../../game/config";
import { useExpeditionStore } from "../../state/useExpeditionStore";
import { useGameStore } from "../../state/useGameStore";
import { publishPlayerFrame } from "../../state/playerTransient";
import { clamp, damp, type RectBounds } from "../../utils/math";
import type { OfficeWorld } from "../../world/createOfficeMap";
import {
  PLAYER_COLLIDER_CENTER_Y,
  PLAYER_LOCOMOTION,
  PLAYER_MOVEMENT,
  PLAYER_PHYSICS,
  type PlayerMotionState
} from "./playerConfig";

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
  const npc = activeNpcId === "eden" ? EDEN : null;
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
  const { world } = useRapier();
  const isPaused = useGameStore((state) => state.isPaused);
  const isDialogOpen = useExpeditionStore((state) => state.panel !== null);
  const activeNpcId = useExpeditionStore((state) => state.panel === "eden" ? "eden" : null);
  const [, getKeys] = useKeyboardControls<GameControl>();
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const velocityRef = useRef(new Vector3());
  const speedRef = useRef(0);   // velocidade escalar ao longo da orientação (+ avança, − recua)
  const motionDirRef = useRef({ x: 0, z: 0 });
  const aimAngleRef = useRef(0);
  const kindRef = useRef<LocomotionKind>("idle");
  const movementRef = useRef(new Vector3());
  const upAxis = useMemo(() => new Vector3(0, 1, 0), []);
  const facingAngleRef = useRef(0);
  const rotationQuaternion = useRef(new Quaternion());

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
    if (isPaused || isDialogOpen) {
      velocityRef.current.set(0, 0, 0);
      speedRef.current = 0;
      kindRef.current = "idle";
      motionRef.current.animationState = 'idle';
      motionRef.current.planarSpeed = 0;
    }
  }, [isPaused, isDialogOpen, motionRef]);

  useBeforePhysicsStep((stepWorld) => {
    const body = rigidBodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    if (!body || !collider || !controller) {
      return;
    }

    const dt = stepWorld.integrationParameters.dt;
    if (simulationBlocked()) {
      // menus, diálogos, pausa, morte e transições: sem deslocamento e sem locomoção no lugar
      velocityRef.current.set(0, 0, 0); speedRef.current = 0; kindRef.current = "idle"; motionRef.current.planarSpeed = 0;
      const st = motionRef.current.animationState;
      if (st === "walking" || st === "backward") motionRef.current.animationState = "idle";
      return;
    }
    const translation = body.translation();
    const keys = getKeys();
    // S2.12 · contrato pela mira: W corre, S recua, W+S neutraliza; A/D não entram.
    const input = aimInput(!!keys[GameControl.Forward], !!keys[GameControl.Backward]);

    // Direção de mira estável: cursor perto do player (ou fora do canvas) mantém a última.
    aimAngleRef.current = updateAimAngle(aimAngleRef.current, translation.x, translation.z,
      combatRuntime.aim.x, combatRuntime.aim.z, combatRuntime.aimValid, PLAYER_LOCOMOTION.aimMinDistance);
    const interactionAngle = isDialogOpen ? getInteractionFacingAngle(translation.x, translation.z, activeNpcId) : null;
    const targetAngle = interactionAngle ?? aimAngleRef.current;
    const rotationAlpha = 1 - Math.pow(1 - PLAYER_MOVEMENT.rotationLerp, dt * 60);
    facingAngleRef.current =
      input !== 0 || interactionAngle !== null
        ? lerpAngle(facingAngleRef.current, targetAngle, rotationAlpha)
        : dampFacing(facingAngleRef.current, targetAngle, 10, dt);

    // O deslocamento usa a mesma direção do corpo (nunca os eixos da câmera): ao recuar o
    // corpo continua voltado ao cursor, sem girar 180°.
    // Só a velocidade escalar é suavizada; a direção é sempre a do corpo neste passo, então
    // girar o cursor correndo ou recuando gira o deslocamento junto (sem arrasto lateral).
    const desiredSpeed = input > 0 ? PLAYER_MOVEMENT.runSpeed : input < 0 ? -PLAYER_MOVEMENT.backSpeed : 0;
    const smoothing = input !== 0 && Math.sign(desiredSpeed) !== -Math.sign(speedRef.current) ? PLAYER_MOVEMENT.acceleration : PLAYER_MOVEMENT.deceleration;
    speedRef.current = damp(speedRef.current, desiredSpeed, smoothing, dt);
    const forward = aimMotion(facingAngleRef.current, 1, motionDirRef.current);
    velocityRef.current.x = forward.x * speedRef.current;
    velocityRef.current.z = forward.z * speedRef.current;

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
        y: PLAYER_COLLIDER_CENTER_Y + (officeWorld.supportHeight?.(translation.x + desiredTranslation.x, translation.z + desiredTranslation.z) ?? 0) - translation.y,
        z: desiredTranslation.z
      },
      undefined,
      undefined,
      (candidate) => !candidate.isSensor()
    );

    const correctedMovement = controller.computedMovement();
    body.setNextKinematicTranslation({
      x: translation.x + correctedMovement.x,
      y: PLAYER_COLLIDER_CENTER_Y + (officeWorld.supportHeight?.(translation.x + correctedMovement.x, translation.z + correctedMovement.z) ?? 0),
      z: translation.z + correctedMovement.z
    });

    rotationQuaternion.current.setFromAxisAngle(upAxis, facingAngleRef.current);
    body.setNextKinematicRotation(rotationQuaternion.current);

    // Locomoção pela velocidade real depois da colisão (parede → Idle) e pelo sentido em
    // relação ao corpo (para trás → Backward).
    const vx = correctedMovement.x / dt, vz = correctedMovement.z / dt;
    const planarSpeed = Math.hypot(vx, vz);
    const along = vx * Math.sin(facingAngleRef.current) + vz * Math.cos(facingAngleRef.current);
    kindRef.current = locomotionKind(kindRef.current, along, planarSpeed, PLAYER_LOCOMOTION.startSpeed, PLAYER_LOCOMOTION.stopSpeed);
    const speedAlpha = MathUtils.clamp(planarSpeed / PLAYER_MOVEMENT.runSpeed, 0, 1);
    const moveAngle = planarSpeed > 0.001 ? Math.atan2(vx, vz) : facingAngleRef.current;

    const now = performance.now() * 0.001;
    motionRef.current.animationState =
      isDialogOpen && now < motionRef.current.actionTriggerUntil
        ? "actionTriggered"
        : isDialogOpen
          ? "interacting"
          : kindRef.current === "run"
            ? "walking"
            : kindRef.current === "backward"
              ? "backward"
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

    // Posição frequente fora do React; a store só recebe a mudança de condição de interação.
    const translation = body.translation();
    publishPlayerFrame(translation.x, translation.y - PLAYER_COLLIDER_CENTER_Y + motionRef.current.visualBob, translation.z, useExpeditionStore.getState().session.map, facingAngleRef.current);
  });

  return null;
}
