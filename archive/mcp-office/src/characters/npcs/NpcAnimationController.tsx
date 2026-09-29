import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { LoopRepeat, type AnimationAction } from "three";
import type { GLBActionMap } from "../GLBCharacter";

interface NpcAnimationControllerProps {
  actions: GLBActionMap;
  interacting: boolean;
}

const CROSSFADE_S = 0.22;

/**
 * Per-NPC animation state machine. Plays Idle by default and crossfades to
 * Talk while the player has dialogue open with this NPC. Falls back silently
 * if the NPC's GLB hasn't been re-baked yet (no actions = nothing happens,
 * model just renders in its source pose).
 *
 * Designed to coexist with the existing procedural pedestal/ring/hover code
 * in MCPNpcModel — that lives on the parent group; this controller only
 * touches the GLB skeleton.
 */
export function NpcAnimationController({ actions, interacting }: NpcAnimationControllerProps) {
  const currentRef = useRef<AnimationAction | null>(null);

  useEffect(() => {
    [actions.Idle, actions.Talk, actions.Walk, actions.Sit].forEach((action) => {
      if (action) {
        action.setLoop(LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
    });

    const idle = actions.Idle;
    if (idle && !currentRef.current) {
      idle.reset().fadeIn(CROSSFADE_S).play();
      currentRef.current = idle;
    }
  }, [actions.Idle, actions.Sit, actions.Talk, actions.Walk]);

  useFrame(() => {
    const target = interacting ? actions.Talk ?? actions.Idle ?? null : actions.Idle ?? null;
    const current = currentRef.current;

    if (target && target !== current) {
      target.reset().fadeIn(CROSSFADE_S).play();
      if (current) {
        current.fadeOut(CROSSFADE_S);
      }
      currentRef.current = target;
    }
  });

  return null;
}
