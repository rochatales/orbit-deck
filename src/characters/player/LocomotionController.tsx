import { FootstepClock, playerSounds } from '../../audio/events';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { LoopOnce, LoopRepeat, type AnimationAction } from "three";
import type { GLBActionMap } from "../GLBCharacter";
import { playbackRate } from "./aimMovement";
import { crossfadeFor, pickTargetAction } from "./locomotionClips";
import {
  PLAYER_BACKWARD_REFERENCE_SPEED,
  PLAYER_LOCOMOTION,
  PLAYER_RUN_REFERENCE_SPEED,
  type PlayerAnimationState,
  type PlayerMotionState
} from "./playerConfig";

interface LocomotionControllerProps {
  motionRef: React.MutableRefObject<PlayerMotionState>;
  actions: GLBActionMap;
}

/**
 * State-driven skeletal animation player. Reads motionRef.animationState every frame and
 * crossfades the AnimationActions on the player's mixer to match. Run e Backward são ciclos
 * in-place: a taxa acompanha a velocidade real (planarSpeed, depois das colisões) para o pé
 * de apoio não deslizar.
 */
export function LocomotionController({ motionRef, actions }: LocomotionControllerProps) {
  const stepClock = useRef(new FootstepClock());
  const currentRef = useRef<AnimationAction | null>(null);
  const stateRef = useRef<PlayerAnimationState | null>(null);

  // Configure each action's loop behavior once when actions become available.
  useEffect(() => {
    const fall = actions.Fall;
    if (fall) {
      fall.setLoop(LoopOnce, 1);
      fall.clampWhenFinished = true;
    }
    [actions.Idle, actions.Run, actions.Talk, actions.Backward].forEach((action) => {
      if (action) {
        action.setLoop(LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
    });

    // Kick off Idle so the character isn't stuck in T-pose during the first frame.
    const idle = actions.Idle;
    if (idle && !currentRef.current) {
      idle.reset().fadeIn(PLAYER_LOCOMOTION.crossfade).play();
      currentRef.current = idle;
      stateRef.current = "idle";
    }
  }, [actions.Fall, actions.Idle, actions.Run, actions.Talk, actions.Backward]);

  useFrame(() => {
    const motion = motionRef.current;
    const target = pickTargetAction(motion.animationState, actions);
    const current = currentRef.current;

    if (target && target !== current) {
      const fade = crossfadeFor(stateRef.current, motion.animationState);
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
    stateRef.current = motion.animationState;

    // Taxa dos ciclos in-place pela velocidade real.
    const active = currentRef.current;
    const run = actions.Run, back = actions.Backward;
    if (run) run.timeScale = active === run && motion.animationState === "walking"
      ? playbackRate(motion.planarSpeed, PLAYER_RUN_REFERENCE_SPEED, PLAYER_LOCOMOTION.runTimeScale) : 1;
    if (back) back.timeScale = active === back
      ? playbackRate(motion.planarSpeed, PLAYER_BACKWARD_REFERENCE_SPEED, PLAYER_LOCOMOTION.backwardTimeScale) : 1;
    // asset sem Backward (comparação): o Run, quando usado no recuo, segue a velocidade real
    if (run && !back && active === run && motion.animationState === "backward")
      run.timeScale = playbackRate(motion.planarSpeed, PLAYER_RUN_REFERENCE_SPEED, PLAYER_LOCOMOTION.runTimeScale);
    if (!simulationBlocked() && active && motion.planarSpeed >= PLAYER_LOCOMOTION.stopSpeed && (motion.animationState === "walking" || motion.animationState === "backward")) {
      if (stepClock.current.advance(motion.animationState, active.time, active.getClip().duration))
        playerSounds.emit('playerStep', playerPosition.x, playerPosition.z);
    } else stepClock.current.reset();
  });

  return null;
}
