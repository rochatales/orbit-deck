import { useFrame } from '@react-three/fiber';
import { simulationBlocked } from '../../game/simulationGate';
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type MutableRefObject } from 'react';
import { Vector3, type Object3D, type Mesh, type PointLight } from 'three';
import { useThree } from '@react-three/fiber';
import { combatRuntime } from '../../state/useCombatStore';
import { comboTrailProgress } from './swordClips';
import { playerPosition } from '../../state/playerTransient';
import { SWORD_LIGHT, createSwordNeon } from './swordNeon';
import { SwordTrail } from './swordTrail';
import type { PlayerMotionState } from './playerConfig';
import type { GLBActionMap } from '../GLBCharacter';
import weaponAsset from '../../assets/weapons/facao-v001.glb';
import clipsAsset from '../../assets/characters/player/explorador-facao-v001.glb';
import swordClipsAsset from '../../assets/characters/player/explorador-espada-v002.glb';
import { attachMachete, attachHolsteredMachete, MacheteGripRig, MacheteHolsterRig } from './macheteAttachment';

function Sword({ scene, motionRef, combat, light }: { scene: Object3D; motionRef: MutableRefObject<PlayerMotionState>; combat: boolean; light?: PointLight | null }) {
  const gltf = useGLTF(weaponAsset);
  const sword = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    return copy;
  }, [gltf.scene]);
  const rig = useMemo(() => new MacheteGripRig(scene, sword), [scene, sword]);
  const holster = useMemo(() => new MacheteHolsterRig(scene, sword), [scene, sword]);
  const neonRef = useRef<ReturnType<typeof createSwordNeon> | null>(null);
  const trail = useMemo(() => new SwordTrail(), []);
  const worldScene = useThree(s => s.scene);
  const wristLed = useRef(0), glow = useRef(0), clock = useRef(0);
  const lightPoint = useMemo(() => new Vector3(), []);
  // A luz fica fora da espada: trocar de arma não muda o número de luzes nem recompila a cena.
  useEffect(() => () => { if (light) light.intensity = 0; }, [light]);
  useEffect(() => {
    const neon = neonRef.current = createSwordNeon(sword);
    return () => { neon.dispose(); neonRef.current = null; };
  }, [sword]);
  useEffect(() => { worldScene.add(trail.mesh); return () => trail.dispose(); }, [worldScene, trail]);
  useFrame((_, delta) => {
    const blocked = simulationBlocked(), step = blocked ? 0 : delta, simulation = combat ? combatRuntime.simulation : null, left = simulation?.meleeLeft ?? 0;
    // Golpe e marcha: lâmina rígida no pulso. Na marcha, o eixo entre as palmas a fazia oscilar ±24°.
    const moving = motionRef.current.animationState === 'walking' || motionRef.current.animationState === 'backward';
    wristLed.current += ((left > 0 || moving ? 1 : 0) - wristLed.current) * (1 - Math.exp(-26 * step));
    glow.current += ((left > 0 ? 1 : 0) - glow.current) * (1 - Math.exp(-26 * step));
    clock.current += step;
    const level = combat ? 1 + .55 * glow.current : .6;
    neonRef.current?.update(clock.current, level);
    if (!combat) holster.update(motionRef.current.animationState === 'dashing', step);
    else if (simulation?.dead) { if (sword.parent) rig.update(false); }
    else if (!blocked && sword.parent) { const state = motionRef.current.animationState; rig.update(state === 'idle' || state === 'walking' || state === 'backward', wristLed.current); }
    if (light?.parent && sword.parent) {
      sword.updateWorldMatrix(true, false);
      light.parent.worldToLocal(sword.localToWorld(lightPoint.set(0, SWORD_LIGHT.bladePoint, 0)));
      light.position.copy(lightPoint);
      light.intensity = SWORD_LIGHT.intensity * (1 + SWORD_LIGHT.swingBoost * glow.current) * neonRef.current!.flicker;
    }
    const state = motionRef.current.animationState;
    if (!combat || simulation?.dead || state === 'dashing') { trail.clear(); return; }
    trail.update(step, simulation?.comboStage ?? 0, comboTrailProgress(simulation?.comboStage ?? 0, left), playerPosition.x, playerPosition.y, playerPosition.z, motionRef.current.facingAngle);
  }, -20);
  useEffect(() => {
    if (combat) attachMachete(scene, sword); else { attachHolsteredMachete(scene, sword); holster.update(); }
    return () => { sword.removeFromParent(); };
  }, [scene, sword, combat, holster]);
  return null;
}
function Clips({ actions, ready }: { actions: GLBActionMap; ready: (actions: GLBActionMap) => void }) {
  const gltf = useGLTF(clipsAsset), swordGltf = useGLTF(swordClipsAsset);
  useEffect(() => {
    const run = actions.Run;
    if (!run) return;
    const mixer = run.getMixer(), root = run.getRoot();
    // Machete_Slash ficou só como histórico: o golpe em uso é o combo Sword_Combo.
    const entries = [...gltf.animations, ...swordGltf.animations].filter(clip => clip.name !== 'Machete_Block' && clip.name !== 'Machete_Slash').map(clip => [clip.name, mixer.clipAction(clip, root)] as const);
    ready(Object.fromEntries(entries));
    return () => { for (const [, action] of entries) { action.stop(); mixer.uncacheAction(action.getClip(), root); } ready({}); };
  }, [gltf, swordGltf, actions, ready]);
  return null;
}
class MacheteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export function PlayerMachete({ scene, motionRef, combat, light }: { scene: Object3D; motionRef: MutableRefObject<PlayerMotionState>; combat: boolean; light?: PointLight | null }) {
  return <MacheteBoundary><Suspense fallback={null}><Sword scene={scene} motionRef={motionRef} combat={combat} light={light}/></Suspense></MacheteBoundary>;
}
export function PlayerMacheteClips(props: { actions: GLBActionMap; ready: (actions: GLBActionMap) => void }) {
  return <MacheteBoundary><Suspense fallback={null}><Clips {...props}/></Suspense></MacheteBoundary>;
}
