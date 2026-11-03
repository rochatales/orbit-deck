import { useFrame } from '@react-three/fiber';
import { simulationBlocked } from '../../game/simulationGate';
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode, type MutableRefObject } from 'react';
import type { Object3D, Mesh } from 'three';
import type { PlayerMotionState } from './playerConfig';
import type { GLBActionMap } from '../GLBCharacter';
import weaponAsset from '../../assets/weapons/facao-v001.glb';
import clipsAsset from '../../assets/characters/player/explorador-facao-v001.glb';
import { attachMachete, attachHolsteredMachete, MacheteGripRig, MacheteHolsterRig } from './macheteAttachment';

function Sword({ scene, motionRef, combat }: { scene: Object3D; motionRef: MutableRefObject<PlayerMotionState>; combat: boolean }) {
  const gltf = useGLTF(weaponAsset);
  const sword = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    return copy;
  }, [gltf.scene]);
  const rig = useMemo(() => new MacheteGripRig(scene, sword), [scene, sword]);
  const holster = useMemo(() => new MacheteHolsterRig(scene, sword), [scene, sword]);
  useFrame(() => {
    if (!combat) holster.update();
    else if (!simulationBlocked() && sword.parent) { const state = motionRef.current.animationState; rig.update(state === 'idle' || state === 'walking' || state === 'backward'); }
  }, -20);
  useEffect(() => {
    if (combat) attachMachete(scene, sword); else { attachHolsteredMachete(scene, sword); holster.update(); }
    return () => { sword.removeFromParent(); };
  }, [scene, sword, combat, holster]);
  return null;
}
function Clips({ actions, ready }: { actions: GLBActionMap; ready: (actions: GLBActionMap) => void }) {
  const gltf = useGLTF(clipsAsset);
  useEffect(() => {
    const run = actions.Run;
    if (!run) return;
    const mixer = run.getMixer(), root = run.getRoot();
    const entries = gltf.animations.filter(clip => clip.name !== 'Machete_Block').map(clip => [clip.name, mixer.clipAction(clip, root)] as const);
    ready(Object.fromEntries(entries));
    return () => { for (const [, action] of entries) { action.stop(); mixer.uncacheAction(action.getClip(), root); } ready({}); };
  }, [gltf, actions, ready]);
  return null;
}
class MacheteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export function PlayerMachete({ scene, motionRef, combat }: { scene: Object3D; motionRef: MutableRefObject<PlayerMotionState>; combat: boolean }) {
  return <MacheteBoundary><Suspense fallback={null}><Sword scene={scene} motionRef={motionRef} combat={combat}/></Suspense></MacheteBoundary>;
}
export function PlayerMacheteClips(props: { actions: GLBActionMap; ready: (actions: GLBActionMap) => void }) {
  return <MacheteBoundary><Suspense fallback={null}><Clips {...props}/></Suspense></MacheteBoundary>;
}
