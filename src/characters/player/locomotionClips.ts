import type { AnimationAction } from "three";
import { PLAYER_LOCOMOTION, type PlayerAnimationState } from "./playerConfig";

/** Ações por nome de clipe (sem depender do componente que carrega o GLB). */
type ActionMap = Partial<Record<string, AnimationAction | null>>;

/**
 * Picks which clip should play right now given the player's motion state.
 * Falls back gracefully if a specific clip isn't loaded yet. Prioridade preservada:
 * queda > interação > locomoção. O GLB anterior não tem Backward: na comparação ele
 * usa o Run (limitação registrada no handoff da S2.12); o Run nunca toca ao contrário.
 */
export function pickTargetAction(state: PlayerAnimationState, actions: ActionMap): AnimationAction | null {
  switch (state) {
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
      return actions.Idle ?? null;
  }
}

/** Duração do crossfade entre dois estados (Run ↔ Backward um pouco mais curto). */
export function crossfadeFor(from: PlayerAnimationState | null, to: PlayerAnimationState) {
  if (to === "falling") return PLAYER_LOCOMOTION.crossfadeFall;
  if ((from === "walking" && to === "backward") || (from === "backward" && to === "walking")) return PLAYER_LOCOMOTION.crossfadeReverse;
  return PLAYER_LOCOMOTION.crossfade;
}
