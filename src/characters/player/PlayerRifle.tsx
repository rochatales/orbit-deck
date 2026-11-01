import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Mesh, type Object3D } from 'three';
import rifleAsset from '../../assets/weapons/rifle-laser-v001.glb';
import { attachRifle, detachRifle, RifleAimRig } from './rifleAttachment';

import { playerPosition, playerFacing } from '../../state/playerTransient';
import { playerWeaponPose, playerHeadPose, resetPlayerWeaponPose } from '../../state/playerWeaponPose';
import { combatRuntime } from '../../state/useCombatStore';
import { VISOR_LIGHT } from '../../scene/lightingConfig';
import { simulationBlocked } from '../../game/simulationGate';
import { PLAYER_COLLIDER_CENTER_Y, PLAYER_MODEL_ROOT_Y, type PlayerMotionState } from './playerConfig';

interface PlayerRifleProps {
  motionRef: MutableRefObject<PlayerMotionState>;
  scene: Object3D;
  onAttached: (attached: boolean) => void;
}

function HandRifle({ scene, onAttached, motionRef }: PlayerRifleProps) {
  const gltf = useGLTF(rifleAsset);
  const rifle = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    return copy;
  }, [gltf.scene]);
  const rig = useMemo(() => new RifleAimRig(scene, rifle, PLAYER_COLLIDER_CENTER_Y + PLAYER_MODEL_ROOT_Y, VISOR_LIGHT.headOffset), [scene, rifle]);
  useFrame(() => {
    if (!simulationBlocked() && rifle.parent) rig.update(
      playerWeaponPose, playerPosition, playerFacing.angle, combatRuntime.aimValid ? combatRuntime.aim : null,
      !(combatRuntime.simulation?.reloadLeft) && (motionRef.current.animationState === 'idle' ||
        motionRef.current.animationState === 'backward' || (motionRef.current.animationState === 'walking' &&
          (combatRuntime.simulation?.cooldown ?? 0) > 0)), playerHeadPose);
  }, -20);
  useEffect(() => {
    onAttached(attachRifle(scene, rifle));
    return () => { detachRifle(rifle); resetPlayerWeaponPose(); onAttached(false); };
  }, [scene, rifle, onAttached]);
  return null;
}

/** Falha ou carregamento do rifle conserva a arma provisória do PlayerModel. */
class RifleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function PlayerRifle(props: PlayerRifleProps) {
  return <RifleBoundary><Suspense fallback={null}><HandRifle {...props} /></Suspense></RifleBoundary>;
}
