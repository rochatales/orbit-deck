import { useWeaponStore } from '../../state/useWeaponStore';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Group, MeshBasicMaterial, Vector3 } from 'three';
import { RIFLE_POSE } from '../../combat/config';
import { simulationBlocked } from '../../game/simulationGate';
import { playerFacing, playerPosition } from '../../state/playerTransient';
import { playerWeaponPose, weaponShotHeight } from '../../state/playerWeaponPose';
import { combatRuntime } from '../../state/useCombatStore';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { RETICLE, meleeReticleTarget, ReticleAim, ReticleAnimation, reticlePixelScale, reticleVisible } from './reticle';
import { ReticleGeometry } from './reticleGeometry';

export function PlayerReticle({ world, combat }: { world: OfficeWorld; combat: boolean }) {
  const weapon = useWeaponStore(s => s.weapon);
  const root = useRef<Group>(null), nativeCursor = useRef('');
  const { gl } = useThree();
  const aim = useMemo(() => new ReticleAim(), []), animation = useMemo(() => new ReticleAnimation(), []);
  const cameraPoint = useMemo(() => new Vector3(), []);
  const cursorGeometry = useMemo(() => new ReticleGeometry(), []);
  const visual = useMemo(() => ({
    normal: new Color(RETICLE.color), target: new Color(RETICLE.targetColor),
    face: new MeshBasicMaterial({ color: RETICLE.color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false }),
    outline: new MeshBasicMaterial({ color: '#071019', transparent: true, opacity: .8, depthTest: false, depthWrite: false, toneMapped: false, fog: false })
  }), []);
  useEffect(() => {
    const canvas = gl.domElement, previous = canvas.style.cursor; nativeCursor.current = previous;
    return () => { canvas.style.cursor = previous; };
  }, [gl]);
  useEffect(() => () => { cursorGeometry.geometry.dispose(); visual.face.dispose(); visual.outline.dispose(); }, [visual, cursorGeometry]);
  useFrame(({ camera, size }, delta) => {
    const cursor = root.current;
    if (!cursor) return;
    const visible = reticleVisible(simulationBlocked(), combatRuntime.aimValid);
    cursor.visible = visible;
    const cursorStyle = visible ? 'none' : nativeCursor.current;
    if (gl.domElement.style.cursor !== cursorStyle) gl.domElement.style.cursor = cursorStyle;
    if (!visible) { animation.update(-1, 0, false); return; }
    const height = weaponShotHeight(playerPosition.y, RIFLE_POSE.height);
    const simulation = combatRuntime.simulation;
    const target = combat && simulation
      ? weapon === 'machete' ? meleeReticleTarget(playerPosition, combatRuntime.aim, playerFacing.angle, world, simulation.robots) : aim.target(playerPosition, combatRuntime.aim, playerFacing.angle, playerWeaponPose, height, world, simulation.robots) : null;
    animation.update(target?.id ?? -1, Math.min(delta, .1), true);
    const marker = combatRuntime.aim;
    cursor.position.set(marker.x, height + RIFLE_POSE.reticleLift, marker.z);
    cursor.quaternion.copy(camera.quaternion);
    cameraPoint.copy(cursor.position).applyMatrix4(camera.matrixWorldInverse);
    const pixel = reticlePixelScale(camera.projectionMatrix.elements[5], size.height, cameraPoint.z, 'isOrthographicCamera' in camera);
    cursor.scale.setScalar(pixel);
    cursorGeometry.setSpread(animation.spread);
    visual.face.color.copy(target ? visual.target : visual.normal);
  });
  return <group ref={root} name="CombatReticle" visible={false} dispose={null}>
    <mesh geometry={cursorGeometry.geometry} material={visual.outline} scale={[1.14, 1.14, 1]} renderOrder={1000}/>
    <mesh geometry={cursorGeometry.geometry} material={visual.face} renderOrder={1001}/>
  </group>;
}
