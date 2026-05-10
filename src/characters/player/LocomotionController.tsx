import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { LoopOnce, LoopRepeat, MathUtils, type AnimationAction } from "three";
import type { GLBActionMap } from "../GLBCharacter";
import {
  PLAYER_RUN_REFERENCE_SPEED,
  type PlayerAnimationState,
  type PlayerMotionState
} from "./playerConfig";

interface LocomotionControllerProps {
  motionRef: React.MutableRefObject<PlayerMotionState>;
  actions: GLBActionMap;
}

const CROSSFADE_DEFAULT_S = 0.18;
const CROSSFADE_FAST_S = 0.06;
const SPEED_SCALE_MIN = 0.45;
const SPEED_SCALE_MAX = 2.6;

/**
 * Picks which clip should play right now given the player's motion state.
 * Falls back gracefully if a specific clip isn't loaded yet.
 */
function pickTargetAction(state: PlayerAnimationState, actions: GLBActionMap): AnimationAction | null {
  switch (state) {
    case "falling":
      return actions.Fall ?? actions.Idle ?? null;
    case "interacting":
    case "actionTriggered":
      return actions.Talk ?? actions.Idle ?? null;
    case "walking":
      return actions.Run ?? actions.Idle ?? null;
    case "idle":
    default:
      return actions.Idle ?? null;
  }
}

/**
 * State-driven skeletal animation player. Replaces the old sin-wave procedural
 * controller. Reads motionRef.animationState every frame and crossfades the
 * AnimationActions on the player's mixer to match. Speed-matches Run playback
 * so foot speed visually tracks actual movement (kills foot sliding).
 */
export function LocomotionController({ motionRef, actions }: LocomotionControllerProps) {
  const currentRef = useRef<AnimationAction | null>(null);

  // Configure each action's loop behavior once when actions become available.
  useEffect(() => {
    const fall = actions.Fall;
    if (fall) {
      fall.setLoop(LoopOnce, 1);
      fall.clampWhenFinished = true;
    }
    [actions.Idle, actions.Run, actions.Talk].forEach((action) => {
      if (action) {
        action.setLoop(LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
    });

    // Kick off Idle so the character isn't stuck in T-pose during the first frame.
    const idle = actions.Idle;
    if (idle && !currentRef.current) {
      idle.reset().fadeIn(CROSSFADE_DEFAULT_S).play();
      currentRef.current = idle;
    }
  }, [actions.Fall, actions.Idle, actions.Run, actions.Talk]);

  useFrame(() => {
    const motion = motionRef.current;
    const target = pickTargetAction(motion.animationState, actions);
    const current = currentRef.current;

    if (target && target !== current) {
      const fade = motion.animationState === "falling" ? CROSSFADE_FAST_S : CROSSFADE_DEFAULT_S;
      target.reset();
      if (motion.animationState === "falling") {
        target.setLoop(LoopOnce, 1);
        target.clampWhenFinished = true;
      } else {
        target.setLoop(LoopRepeat, Infinity);
        target.clampWhenFinished = false;
      }
      target.fadeIn(fade);
      target.play();
      if (current) {
        current.fadeOut(fade);
      }
      currentRef.current = target;
    }

    // Speed-match the run cycle to actual movement so feet don't slide.
    const run = actions.Run;
    if (run) {
      if (current === run) {
        const ratio = motion.planarSpeed / PLAYER_RUN_REFERENCE_SPEED;
        run.timeScale = MathUtils.clamp(ratio, SPEED_SCALE_MIN, SPEED_SCALE_MAX);
      } else {
        run.timeScale = 1;
      }
    }
  });

  return null;
}
