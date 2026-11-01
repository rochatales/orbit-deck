import { FootstepClock, playerSounds } from '../../audio/events';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { LoopOnce, LoopRepeat, type AnimationAction } from "three";
import type { GLBActionMap } from "../GLBCharacter";
import type { CharacterAssetConfig } from "../characterAssetConfig";
import { configureLocomotionAction, crossfadeFor, locomotionCalibration, pickTargetAction, updateLocomotionRates } from "./locomotionClips";
import {
  PLAYER_LOCOMOTION,
  type PlayerAnimationState,
  type PlayerMotionState
} from "./playerConfig";

interface LocomotionControllerProps {
  motionRef: React.MutableRefObject<PlayerMotionState>;
  actions: GLBActionMap;
  asset: CharacterAssetConfig;
  combat: boolean;
}

/**
 * State-driven skeletal animation player. Reads motionRef.animationState every frame and
 * crossfades the AnimationActions on the player's mixer to match. Run e Backward são ciclos
 * in-place: a taxa acompanha a velocidade real (planarSpeed, depois das colisões) para o pé
 * de apoio não deslizar.
 */
export function LocomotionController({ motionRef, actions, asset, combat }: LocomotionControllerProps) {
  const calibration = useMemo(() => locomotionCalibration(asset), [asset]);
  const stepClock = useRef(new FootstepClock());
  const currentRef = useRef<AnimationAction | null>(null);
  const stateRef = useRef<PlayerAnimationState | null>(null);

  // Configure each action's loop behavior once when actions become available.
  useEffect(() => {
    for (const action of [actions.Fall, actions.Dash]) if (action) { action.setLoop(LoopOnce,1); action.clampWhenFinished = true; }
    [actions.Idle, actions.Run, actions.Talk, actions.Backward, actions.Aim_Rifle, actions.Run_Rifle].forEach((action) => {
      if (action) {
        action.setLoop(LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
    });

    // Kick off Idle so the character isn't stuck in T-pose during the first frame.
    const idle = pickTargetAction("idle", actions, combat);
    if (idle && !currentRef.current) {
      idle.reset().fadeIn(PLAYER_LOCOMOTION.crossfade).play();
      currentRef.current = idle;
      stateRef.current = "idle";
    }
  }, [actions.Fall, actions.Dash, actions.Idle, actions.Run, actions.Talk, actions.Backward, actions.Aim_Rifle, actions.Run_Rifle, combat]);

  useFrame(() => {
    const motion = motionRef.current;
    const target = pickTargetAction(motion.animationState, actions, combat);
    const current = currentRef.current;

    const onceChanged = motion.animationState !== stateRef.current &&
      (motion.animationState === 'dashing' || stateRef.current === 'dashing' || motion.animationState === 'falling' || stateRef.current === 'falling');
    if (target && (target !== current || onceChanged)) {
      const fade = crossfadeFor(stateRef.current, motion.animationState);
      target.reset();
      configureLocomotionAction(target, motion.animationState);
      target.fadeIn(fade);
      target.play();
      if (current && current !== target) {
        current.fadeOut(fade);
      }
      currentRef.current = target;
    }
    stateRef.current = motion.animationState;

    // Taxa dos ciclos in-place pela velocidade real.
    const active = currentRef.current;
    updateLocomotionRates(actions, active, motion.animationState, motion.planarSpeed, calibration);
    if (!simulationBlocked() && active && motion.planarSpeed >= PLAYER_LOCOMOTION.stopSpeed && (motion.animationState === "walking" || motion.animationState === "backward")) {
      if (stepClock.current.advance(motion.animationState, active.time, active.getClip().duration))
        playerSounds.emit('playerStep', playerPosition.x, playerPosition.z);
    } else stepClock.current.reset();
  }, -40);

  return null;
}
