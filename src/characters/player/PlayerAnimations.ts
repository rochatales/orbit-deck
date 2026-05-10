import { MathUtils } from "three";
import type { PlayerAnimationState } from "./playerConfig";
import { PLAYER_ANIMATION } from "./playerAnimationConfig";

export function getIdleBob(elapsedTime: number) {
  return Math.sin(elapsedTime * PLAYER_ANIMATION.idleBobSpeed) * PLAYER_ANIMATION.idleBobAmplitude;
}

export function getWalkBob(elapsedTime: number, speedAlpha: number) {
  return Math.sin(elapsedTime * PLAYER_ANIMATION.walkBobSpeed) * PLAYER_ANIMATION.walkBobAmplitude * speedAlpha;
}

export function getBodyLean(animationState: PlayerAnimationState, speedAlpha: number) {
  const baseLean = -PLAYER_ANIMATION.bodyLeanAmount * speedAlpha;
  if (animationState === "interacting") {
    return baseLean * 0.25;
  }
  if (animationState === "actionTriggered") {
    return baseLean * 0.2 + PLAYER_ANIMATION.interactionTilt * 0.6;
  }
  return baseLean;
}

export function getBackpackBounce(elapsedTime: number, speedAlpha: number) {
  return Math.abs(Math.sin(elapsedTime * PLAYER_ANIMATION.walkBobSpeed)) * PLAYER_ANIMATION.backpackBounceAmount * speedAlpha;
}

export function getArmSwing(elapsedTime: number, speedAlpha: number) {
  return Math.sin(elapsedTime * PLAYER_ANIMATION.walkBobSpeed) * PLAYER_ANIMATION.armSwingAmplitude * speedAlpha;
}

export function getHelmetBreath(elapsedTime: number) {
  return Math.sin(elapsedTime * 1.35 + 0.45) * (PLAYER_ANIMATION.idleBobAmplitude * 0.72);
}

export function getBodySway(elapsedTime: number, speedAlpha: number) {
  return Math.sin(elapsedTime * PLAYER_ANIMATION.walkBobSpeed * 0.5) * 0.045 * speedAlpha;
}

export function getBootStep(elapsedTime: number, speedAlpha: number, phaseOffset: number) {
  return Math.abs(Math.sin(elapsedTime * PLAYER_ANIMATION.walkBobSpeed + phaseOffset)) * 0.06 * speedAlpha;
}

export function getVisorGlow(elapsedTime: number, animationState: PlayerAnimationState, speedAlpha: number) {
  const pulse = (Math.sin(elapsedTime * 2.8) * 0.5 + 0.5) * PLAYER_ANIMATION.visorPulseAmplitude;
  if (animationState === "actionTriggered") {
    return 0.28 + pulse * 1.35;
  }
  if (animationState === "interacting") {
    return 0.24 + pulse;
  }
  return 0.14 + pulse * (0.45 + speedAlpha * 0.35);
}

export function getChestGlow(animationState: PlayerAnimationState, speedAlpha: number) {
  if (animationState === "actionTriggered") {
    return PLAYER_ANIMATION.chestGlowActive + 0.28;
  }
  if (animationState === "interacting") {
    return PLAYER_ANIMATION.chestGlowActive;
  }
  return MathUtils.lerp(PLAYER_ANIMATION.chestGlowIdle, PLAYER_ANIMATION.chestGlowActive * 0.78, speedAlpha);
}
