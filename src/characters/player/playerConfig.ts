export const PLAYER_COLORS = {
  helmet: "#F3EEF0",
  suit: "#D98F7F",
  suitShadow: "#A76E6D",
  gloves: "#EDEAE4",
  boots: "#D8D8D2",
  visor: "#071827",
  visorHighlight: "#3D6E8A",
  backpack: "#BFC8CC",
  techAccent: "#66E6FF",
  shadowBlue: "#2B4A5B",
  harness: "#7A6B72",
  utility: "#B8B3B1"
} as const;

export const PLAYER_MOVEMENT = {
  // S2.12 (movimento pela mira): W corre sem Shift; S recua mais devagar. Valores iniciais
  // para avaliação do autor. Antes: 3,2 m/s andando e 5,6 m/s com Shift.
  runSpeed: 4.2,
  backSpeed: 1.2,
  dashSpeed: 7.2,
  dashDuration: 0.72,
  dashCooldown: 0.95,
  acceleration: 10,
  deceleration: 14,
  rotationLerp: 0.18,
  colliderHeight: 1.25,
  colliderRadius: 0.32,
  visualHeight: 1.5,
  interactionRadius: 2.3
} as const;

export const PLAYER_PHYSICS = {
  controllerOffset: 0.06,
  autostepMaxHeight: 0.26,
  autostepMinWidth: 0.16,
  snapToGroundDistance: 0.24,
  colliderSkin: 0.02,
  obstacleHeight: 1.55
} as const;

export const PLAYER_COLLIDER_HALF_HEIGHT =
  (PLAYER_MOVEMENT.colliderHeight - PLAYER_MOVEMENT.colliderRadius * 2) / 2;

export const PLAYER_COLLIDER_CENTER_Y =
  PLAYER_COLLIDER_HALF_HEIGHT + PLAYER_MOVEMENT.colliderRadius;

export const PLAYER_MODEL_ROOT_Y = -PLAYER_COLLIDER_CENTER_Y + 0.02;

export type PlayerAnimationState =
  | "idle"
  | "walking"
  | "backward"
  | "interacting"
  | "actionTriggered"
  | "falling"
  | "dashing";

export interface PlayerMotionState {
  animationState: PlayerAnimationState;
  speedAlpha: number;
  planarSpeed: number;
  facingAngle: number;
  moveAngle: number;
  visualBob: number;
  bodyLean: number;
  isGrounded: boolean;
  actionTriggerUntil: number;
  fallTriggerUntil: number;
}

export function createInitialPlayerMotionState(): PlayerMotionState {
  return {
    animationState: "idle",
    speedAlpha: 0,
    planarSpeed: 0,
    facingAngle: 0,
    moveAngle: 0,
    visualBob: 0,
    bodyLean: 0,
    isGrounded: true,
    actionTriggerUntil: 0,
    fallTriggerUntil: 0
  };
}

// Speed (in m/s) at which the Mixamo "Slow Run" clip's footwork looks natural.
// LocomotionController scales the action's timeScale by planarSpeed/this so the
// gait visually matches the actual character movement at any pace (kills foot
// sliding without IK).
export const PLAYER_RUN_REFERENCE_SPEED = 1.6;

/**
 * S2.12 · locomoção pela velocidade real (depois das colisões):
 * - Backward (S6.8 r6b/r7): ciclo in-place de 0,533 s cuja velocidade de referência é 0,80 m/s,
 *   medida com o pé de apoio parado. É a referência de reprodução, não a velocidade de recuo;
 * - timeScale = velocidade real / referência, dentro dos limites; abaixo de `stopSpeed` a
 *   locomoção vira Idle (parado contra parede não "corre no lugar"), com histerese até `startSpeed`;
 * - transições por crossfade curto.
 */
export const PLAYER_BACKWARD_REFERENCE_SPEED = 0.8;
export const PLAYER_LOCOMOTION = {
  startSpeed: 0.3,
  stopSpeed: 0.15,
  runTimeScale: [0.45, 2.8] as const,
  backwardTimeScale: [0.5, 2.0] as const,
  crossfade: 0.18,
  crossfadeReverse: 0.14,
  crossfadeFall: 0.06,
  crossfadeDash: 0.08,
  /** Só 3,5 cm no centro estabilizam a orientação; cursor visual continua livre.
   * A zona antiga de 0,9 m impedia mirar/virar contra inimigos próximos. */
  aimMinDistance: 0.035
} as const;
