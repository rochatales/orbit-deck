import { LoopOnce, LoopRepeat, type AnimationAction } from "three";
import type { CharacterAssetConfig } from "../characterAssetConfig";
import { playbackRate } from "./aimMovement";
import { PLAYER_BACKWARD_REFERENCE_SPEED, PLAYER_RUN_REFERENCE_SPEED, PLAYER_LOCOMOTION, PLAYER_MOVEMENT, type PlayerAnimationState } from "./playerConfig";

/** Ações por nome de clipe (sem depender do componente que carrega o GLB). */
type ActionMap = Partial<Record<string, AnimationAction | null>>;

/**
 * Picks which clip should play right now given the player's motion state.
 * Falls back gracefully if a specific clip isn't loaded yet. Prioridade preservada:
 * queda > interação > locomoção. O GLB anterior não tem Backward: na comparação ele
 * usa o Run (limitação registrada no handoff da S2.12); o Run nunca toca ao contrário.
 */
export function pickTargetAction(state: PlayerAnimationState, actions: ActionMap, combat = false): AnimationAction | null {
  switch (state) {
    case "dashing":
      return actions.Dash ?? actions.Run ?? actions.Idle ?? null;
    case "falling":
      return actions.Fall ?? actions.Idle ?? null;
    case "interacting":
    case "actionTriggered":
      return actions.Talk ?? actions.Idle ?? null;
    case "walking":
      return actions.Run ?? actions.Idle ?? null;
    case "backward":
      return actions.Backward ?? actions.Run ?? actions.Idle ?? null;
    case "idle":
    default:
      return (combat ? actions.Aim_Rifle : null) ?? actions.Idle ?? null;
  }
}

/** Duração do crossfade entre dois estados (Run ↔ Backward um pouco mais curto). */
export function crossfadeFor(from: PlayerAnimationState | null, to: PlayerAnimationState) {
  if (to === "dashing" || from === "dashing") return PLAYER_LOCOMOTION.crossfadeDash;
  if (to === "falling") return PLAYER_LOCOMOTION.crossfadeFall;
  if ((from === "walking" && to === "backward") || (from === "backward" && to === "walking")) return PLAYER_LOCOMOTION.crossfadeReverse;
  return PLAYER_LOCOMOTION.crossfade;
}

/** Uma configuração por variante, preparada fora do quadro. */
export function locomotionCalibration(asset: Pick<CharacterAssetConfig, 'runReferenceSpeed' | 'combatRunReferenceSpeed' | 'backwardReferenceSpeed' | 'backwardTimeScale'>) {
  return {
    combatRunReferenceSpeed: asset.combatRunReferenceSpeed ?? asset.runReferenceSpeed ?? PLAYER_RUN_REFERENCE_SPEED,
    runReferenceSpeed: asset.runReferenceSpeed ?? PLAYER_RUN_REFERENCE_SPEED,
    backwardReferenceSpeed: asset.backwardReferenceSpeed ?? PLAYER_BACKWARD_REFERENCE_SPEED,
    backwardTimeScale: asset.backwardTimeScale ?? PLAYER_LOCOMOTION.backwardTimeScale
  };
}

/** Resolvido fora do quadro; preserva ações e fallback das variantes antigas. */
export function colonyLocomotionActions(actions: ActionMap): ActionMap {
  if (!actions.Run_Colony && !actions.Idle_Colony && !actions.Backward_Colony) return actions;
  return { ...actions, Idle: actions.Idle_Colony ?? actions.Idle,
    Run: actions.Run_Colony ?? actions.Run,
    Backward: actions.Backward_Colony ?? actions.Backward_Rifle ?? actions.Backward };
}

export function mapLocomotionCalibration(asset: CharacterAssetConfig, combat: boolean) {
  return locomotionCalibration({ ...asset,
    runReferenceSpeed: (combat ? asset.combatRunReferenceSpeed : asset.colonyRunReferenceSpeed) ?? asset.runReferenceSpeed,
    backwardReferenceSpeed: (combat ? asset.combatBackwardReferenceSpeed : asset.colonyBackwardReferenceSpeed) ?? asset.backwardReferenceSpeed
  });
}

/** Atualiza as ações já existentes, sem criar objetos no quadro. */
export function updateLocomotionRates(actions: ActionMap, active: AnimationAction | null, state: PlayerAnimationState, speed: number, calibration: ReturnType<typeof locomotionCalibration>) {
  const run = actions.Run, armed = actions.Run_Rifle, back = actions.Backward;
  if (run) run.timeScale = active === run && (state === 'walking' || (!back && state === 'backward'))
    ? playbackRate(speed, calibration.runReferenceSpeed, PLAYER_LOCOMOTION.runTimeScale) : 1;
  if (armed) armed.timeScale = active === armed && state === 'walking'
    ? playbackRate(speed, calibration.combatRunReferenceSpeed, PLAYER_LOCOMOTION.runTimeScale) : 1;
  if (back) back.timeScale = active === back
    ? playbackRate(speed, calibration.backwardReferenceSpeed, calibration.backwardTimeScale) : 1;
}

/** O mesmo fallback pode servir Dash e Run; restaura o loop mesmo sem trocar de ação. */
export function configureLocomotionAction(action: AnimationAction, state: PlayerAnimationState) {
  const once = state === 'dashing' || state === 'falling';
  action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  action.timeScale = state === 'dashing' ? action.getClip().duration / PLAYER_MOVEMENT.dashDuration : 1;
}
