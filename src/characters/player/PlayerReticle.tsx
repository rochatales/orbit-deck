import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Group, MeshBasicMaterial, Shape, ShapeGeometry, Vector3 } from 'three';
import { RIFLE_POSE } from '../../combat/config';
import { simulationBlocked } from '../../game/simulationGate';
import { playerActions } from '../../state/playerActions';
import { playerFacing, playerPosition } from '../../state/playerTransient';
import { playerWeaponPose, weaponShotHeight } from '../../state/playerWeaponPose';
import { combatRuntime } from '../../state/useCombatStore';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { RETICLE, ReticleAim, ReticleAnimation, reticlePixelScale } from './reticle';

/** Quatro chevrons e um ponto: geometria vetorial compartilhada, dois draws com contorno. */
function cursorGeometry() {
  const shapes: Shape[] = [];
  const points = [[-5, 11], [-3, 9], [0, 12], [3, 9], [5, 11], [0, 16]];
  for (let i = 0; i < 4; i++) {
    const angle = -i * Math.PI / 2, sin = Math.sin(angle), cos = Math.cos(angle), shape = new Shape();
    points.forEach(([x, y], index) => {
      const px = x * cos - y * sin, py = x * sin + y * cos;
      if (index === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
    });
    shape.closePath(); shapes.push(shape);
  }
  const dot = new Shape(); dot.absarc(0, 0, 2, 0, Math.PI * 2, false); shapes.push(dot);
  return new ShapeGeometry(shapes, 12);
}

export function PlayerReticle({ world, combat }: { world: OfficeWorld; combat: boolean }) {
  const root = useRef<Group>(null), nativeCursor = useRef('');
  const { gl } = useThree();
  const aim = useMemo(() => new ReticleAim(), []), animation = useMemo(() => new ReticleAnimation(), []);
  const cameraPoint = useMemo(() => new Vector3(), []);
  const visual = useMemo(() => ({
    geometry: cursorGeometry(), normal: new Color(RETICLE.color), target: new Color(RETICLE.targetColor),
    face: new MeshBasicMaterial({ color: RETICLE.color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false }),
    outline: new MeshBasicMaterial({ color: '#071019', transparent: true, opacity: .8, depthTest: false, depthWrite: false, toneMapped: false, fog: false })
  }), []);
  useEffect(() => {
    const canvas = gl.domElement, previous = canvas.style.cursor; nativeCursor.current = previous;
    return () => { canvas.style.cursor = previous; };
  }, [gl]);
  useEffect(() => () => { visual.geometry.dispose(); visual.face.dispose(); visual.outline.dispose(); }, [visual]);
  useFrame(({ camera, size }, delta) => {
    const cursor = root.current;
    if (!cursor) return;
    const visible = !simulationBlocked() && combatRuntime.aimValid && !playerActions.dashing;
    cursor.visible = visible;
    const cursorStyle = visible ? 'none' : nativeCursor.current;
    if (gl.domElement.style.cursor !== cursorStyle) gl.domElement.style.cursor = cursorStyle;
    if (!visible) { animation.update(-1, 0, false); return; }
    const height = weaponShotHeight(playerPosition.y, RIFLE_POSE.height);
    const simulation = combatRuntime.simulation;
    const target = combat && simulation
      ? aim.target(playerPosition, combatRuntime.aim, playerFacing.angle, playerWeaponPose, height, world, simulation.robots) : null;
    animation.update(target?.id ?? -1, Math.min(delta, .1), true);
    const marker = combat && simulation ? aim.marker : combatRuntime.aim;
    cursor.position.set(marker.x, height + RIFLE_POSE.reticleLift, marker.z);
    cursor.quaternion.copy(camera.quaternion);
    cameraPoint.copy(cursor.position).applyMatrix4(camera.matrixWorldInverse);
    const pixel = reticlePixelScale(camera.projectionMatrix.elements[5], size.height, cameraPoint.z, 'isOrthographicCamera' in camera);
    cursor.scale.setScalar(pixel * animation.scale);
    visual.face.color.copy(target ? visual.target : visual.normal);
  });
  return <group ref={root} name="CombatReticle" visible={false} dispose={null}>
    <mesh geometry={visual.geometry} material={visual.outline} scale={[1.14, 1.14, 1]} renderOrder={1000}/>
    <mesh geometry={visual.geometry} material={visual.face} renderOrder={1001}/>
  </group>;
}
