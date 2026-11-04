import { recoverBackpackEnergy } from '../../game/backpackConfig';
import { backpackEnergy, resetBackpackEnergy } from '../../state/useBackpackEnergy';
import { advanceDash, dashEnabled } from './playerDash';
import { SwordRootMotion } from './swordRootMotion';
import { useWeaponStore } from '../../state/useWeaponStore';
import { meleeLungeBlocked } from '../../combat/melee';
import { constrainToWalkableAreas } from './playerMovement';
import { playerActions } from '../../state/playerActions';
import { recordPhysicsStep } from '../../physics/interpolationTelemetry';
import { INTERPOLATE, PLAYER_POSE_PRIORITY } from '../../physics/interpolation';
import { approachSupportHeight } from '../../game/supportHeight';
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MathUtils, Quaternion, Vector3 } from "three";
import { aimInput, aimMotion, dampFacing, locomotionKind, updateAimAngle, type LocomotionKind } from "./aimMovement";
import { combatRuntime } from "../../state/useCombatStore";
import { simulationBlocked, useSimulationBlocked } from "../../game/simulationGate";
import { GameControl } from "../../controls/keyboardControls";
import { EDEN } from "../../game/config";
import { useExpeditionStore } from "../../state/useExpeditionStore";
import { publishPlayerFrame, writePlayerVisualPosition } from "../../state/playerTransient";
import { damp } from "../../utils/math";
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

const solidOnly = (candidate: RapierCollider) => !candidate.isSensor();

function lerpAngle(current: number, target: number, alpha: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * alpha;
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
  const { world, rigidBodyStates } = useRapier();
  const revision = useRef(useExpeditionStore.getState().session.revision);
  const blocked = useSimulationBlocked();
  const sessionRevision = useExpeditionStore(s => s.session.revision);
  useEffect(() => { resetBackpackEnergy(); }, [officeWorld, sessionRevision]);
  const isDialogOpen = useExpeditionStore((state) => state.panel !== null);
  const activeNpcId = useExpeditionStore((state) => state.panel === "eden" ? "eden" : null);
  const [, getKeys] = useKeyboardControls<GameControl>();
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const velocityRef = useRef(new Vector3());
  const dashUntilRef = useRef(0), dashCooldownUntilRef = useRef(0), dashHeldRef = useRef(false);
  const dashClockRef = useRef(0), wasDashingRef = useRef(false);
  const allowedMovement = useRef({ x:0, z:0 });
  const moveCommand = useRef({ x:0, y:0, z:0 }), nextTranslation = useRef({ x:0, y:0, z:0 });
  const speedRef = useRef(0);   // velocidade escalar ao longo da orientação (+ avança, − recua)
  const swordRoot = useMemo(() => new SwordRootMotion(), []);
  const motionDirRef = useRef({ x: 0, z: 0 });
  const aimAngleRef = useRef(0);
  const kindRef = useRef<LocomotionKind>("idle");
  const movementRef = useRef(new Vector3());
  const upAxis = useMemo(() => new Vector3(0, 1, 0), []);
  const facingAngleRef = useRef(0);
  const rotationQuaternion = useRef(new Quaternion());

  useEffect(() => {
    const space = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.repeat || simulationBlocked()) event.stopImmediatePropagation();
      if (!simulationBlocked()) event.preventDefault();
    };
    window.addEventListener('keydown', space, true);
    return () => window.removeEventListener('keydown', space, true);
  }, []);

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
    if (blocked) {
      dashUntilRef.current = 0; dashHeldRef.current = false; wasDashingRef.current = false; playerActions.dashing = false;
      velocityRef.current.set(0, 0, 0);
      speedRef.current = 0;
      kindRef.current = "idle";
      motionRef.current.animationState = 'idle';
      motionRef.current.planarSpeed = 0;
    }
  }, [blocked, motionRef]);

  useBeforePhysicsStep((stepWorld) => {
    const body = rigidBodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    if (!body || !collider || !controller) {
      return;
    }

    const dt = stepWorld.integrationParameters.dt;
    recordPhysicsStep(dt);
    if (simulationBlocked()) {
      swordRoot.reset();
      advanceDash(dashClockRef.current, false, true, dashUntilRef, dashCooldownUntilRef, dashHeldRef);
      wasDashingRef.current = false; playerActions.dashing = false;
      // menus, diálogos, pausa, morte e transições: sem deslocamento e sem locomoção no lugar
      velocityRef.current.set(0, 0, 0); speedRef.current = 0; kindRef.current = "idle"; motionRef.current.planarSpeed = 0;
      const st = motionRef.current.animationState;
      if (st === "walking" || st === "backward" || st === "dashing") motionRef.current.animationState = "idle";
      return;
    }
    const translation = body.translation();
    const keys = getKeys();
    const dashNow = dashClockRef.current;
    recoverBackpackEnergy(backpackEnergy, dt);
    const isDashing = advanceDash(dashNow, !!keys[GameControl.Dash], !dashEnabled(useExpeditionStore.getState().session.map), dashUntilRef, dashCooldownUntilRef, dashHeldRef, backpackEnergy);
    dashClockRef.current += dt;
    playerActions.dashing = isDashing;
    // S2.12 · contrato pela mira: W corre, S recua, W+S neutraliza; A/D não entram.
    const input = aimInput(!!keys[GameControl.Forward], !!keys[GameControl.Backward]);

    // Direção de mira estável: cursor perto do player (ou fora do canvas) mantém a última.
    aimAngleRef.current = updateAimAngle(aimAngleRef.current, translation.x, translation.z,
      combatRuntime.aim.x, combatRuntime.aim.z, combatRuntime.aimValid, PLAYER_LOCOMOTION.aimMinDistance);
    const interactionAngle = isDialogOpen ? getInteractionFacingAngle(translation.x, translation.z, activeNpcId) : null;
    const targetAngle = interactionAngle ?? aimAngleRef.current;
    const simulation = useExpeditionStore.getState().session.map === 'shanghai' ? combatRuntime.simulation : null;
    let swordStepping = false;
    if (simulation && !isDashing && useWeaponStore.getState().weapon === 'machete') {
      swordStepping = swordRoot.update(simulation.swingId, simulation.comboStage, simulation.meleeLeft, targetAngle);
    } else swordRoot.reset();
    const rotationAlpha = 1 - Math.pow(1 - PLAYER_MOVEMENT.rotationLerp, dt * 60);
    facingAngleRef.current =
      swordStepping ? swordRoot.angle : input !== 0 || interactionAngle !== null
        ? lerpAngle(facingAngleRef.current, targetAngle, rotationAlpha)
        : dampFacing(facingAngleRef.current, targetAngle, 10, dt);

    // O deslocamento usa a mesma direção do corpo (nunca os eixos da câmera): ao recuar o
    // corpo continua voltado ao cursor, sem girar 180°.
    // Só a velocidade escalar é suavizada; a direção é sempre a do corpo neste passo, então
    // girar o cursor correndo ou recuando gira o deslocamento junto (sem arrasto lateral).
    const desiredSpeed = input > 0 ? PLAYER_MOVEMENT.runSpeed : input < 0 ? -PLAYER_MOVEMENT.backSpeed : 0;
    const smoothing = input !== 0 && Math.sign(desiredSpeed) !== -Math.sign(speedRef.current) ? PLAYER_MOVEMENT.acceleration : PLAYER_MOVEMENT.deceleration;
    if (isDashing) speedRef.current = PLAYER_MOVEMENT.dashSpeed;
    else if (wasDashingRef.current) speedRef.current = desiredSpeed;
    else speedRef.current = damp(speedRef.current, desiredSpeed, smoothing, dt);
    wasDashingRef.current = isDashing;
    const movementDt = isDashing ? Math.min(dt, dashUntilRef.current - dashNow) : dt;
    const forward = aimMotion(facingAngleRef.current, 1, motionDirRef.current);
    // O corte de corpo inteiro substitui a corrida pelo passo autorado, inclusive sua deriva lateral.
    // Não soma a inércia de W/S: era ela que arrastava os pés durante o giro.
    if (swordStepping) {
      speedRef.current = 0;
      const stopped = (!!keys[GameControl.Forward] && !!keys[GameControl.Backward])
        || meleeLungeBlocked(translation, facingAngleRef.current, simulation!.robots);
      velocityRef.current.x = stopped ? 0 : swordRoot.x / dt;
      velocityRef.current.z = stopped ? 0 : swordRoot.z / dt;
    } else {
      velocityRef.current.x = forward.x * speedRef.current;
      velocityRef.current.z = forward.z * speedRef.current;
    }

    const desiredTranslation = constrainToWalkableAreas(
      translation.x,
      translation.z,
      velocityRef.current.x * movementDt,
      velocityRef.current.z * movementDt,
      officeWorld.bounds,
      officeWorld.walkableAreas,
      PLAYER_MOVEMENT.colliderRadius, allowedMovement.current
    );

    const command = moveCommand.current;
    command.x = desiredTranslation.x; command.z = desiredTranslation.z;
    command.y = PLAYER_COLLIDER_CENTER_Y + approachSupportHeight(translation.y - PLAYER_COLLIDER_CENTER_Y,
      officeWorld.supportHeight?.(translation.x + command.x, translation.z + command.z) ?? 0, dt, officeWorld.supportTransition) - translation.y;
    controller.computeColliderMovement(collider, command, undefined, undefined, solidOnly);
    const correctedMovement = controller.computedMovement(), next = nextTranslation.current;
    next.x = translation.x + correctedMovement.x; next.z = translation.z + correctedMovement.z;
    next.y = PLAYER_COLLIDER_CENTER_Y + approachSupportHeight(translation.y - PLAYER_COLLIDER_CENTER_Y,
      officeWorld.supportHeight?.(next.x, next.z) ?? 0, dt, officeWorld.supportTransition);
    body.setNextKinematicTranslation(next);

    rotationQuaternion.current.setFromAxisAngle(upAxis, facingAngleRef.current);
    body.setNextKinematicRotation(rotationQuaternion.current);

    // Locomoção pela velocidade real depois da colisão (parede → Idle) e pelo sentido em
    // relação ao corpo (para trás → Backward).
    const vx = correctedMovement.x / dt, vz = correctedMovement.z / dt;
    // O passo do golpe não conta como locomoção: quem está parado continua no corpo todo do corte.
    const planarSpeed = swordStepping ? 0 : Math.hypot(vx, vz);
    const along = swordStepping ? 0 : vx * Math.sin(facingAngleRef.current) + vz * Math.cos(facingAngleRef.current);
    kindRef.current = locomotionKind(kindRef.current, along, planarSpeed, PLAYER_LOCOMOTION.startSpeed, PLAYER_LOCOMOTION.stopSpeed);
    const speedAlpha = MathUtils.clamp(planarSpeed / PLAYER_MOVEMENT.runSpeed, 0, 1);
    const moveAngle = planarSpeed > 0.001 ? Math.atan2(vx, vz) : facingAngleRef.current;

    const now = performance.now() * 0.001;
    motionRef.current.animationState =
      isDashing ? "dashing" : isDialogOpen && now < motionRef.current.actionTriggerUntil
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
    motionRef.current.aimAngle = targetAngle;
    motionRef.current.isGrounded = controller.computedGrounded();
  });

  useFrame(() => {
    const body = rigidBodyRef.current;
    if (!body) {
      return;
    }

    // Posição frequente fora do React; a store só recebe a mudança de condição de interação.
    if (INTERPOLATE && revision.current !== useExpeditionStore.getState().session.revision) return;
    const translation = body.translation();
    publishPlayerFrame(translation.x, translation.y - PLAYER_COLLIDER_CENTER_Y + motionRef.current.visualBob, translation.z, useExpeditionStore.getState().session.map, facingAngleRef.current);
    const visual = INTERPOLATE ? rigidBodyStates.get(body.handle)?.object : null;
    if (visual) {
      visual.getWorldPosition(movementRef.current);
      writePlayerVisualPosition(movementRef.current.x, movementRef.current.y - PLAYER_COLLIDER_CENTER_Y, movementRef.current.z);
    } else writePlayerVisualPosition(translation.x, translation.y - PLAYER_COLLIDER_CENTER_Y, translation.z);
  }, PLAYER_POSE_PRIORITY);

  return null;
}
