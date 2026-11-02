import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Mesh, RingGeometry } from 'three';
import type { Pickup } from './simulation';
import { simulationBlocked } from '../game/simulationGate';
import { createMedkitRig, MEDKIT_VISUAL } from './healthPickupRig';
import { createGroundRingMaterial } from './groundRingMaterial';
import medkitUrl from '../assets/props/shanghai/medkit.glb';

export function HealthPickups({ pickups, surfaceHeight }: { pickups: Pickup[]; surfaceHeight?: (x: number, z: number) => number }) {
  const source = useGLTF(medkitUrl), clock = useRef(0);
  const rings = useMemo(() => ({ geometry: new RingGeometry(0, 1, 64), material: createGroundRingMaterial(MEDKIT_VISUAL.ringColor) }), []);
  const rigs = useMemo(() => pickups.map((pickup, i) => {
    const rig = createMedkitRig(source.scene, pickup, surfaceHeight?.(pickup.x, pickup.z) ?? 0, i), ring = new Mesh(rings.geometry, rings.material);
    ring.rotation.x = -Math.PI / 2; ring.position.y = rig.ringY; rig.root.add(ring); rig.update(0);
    return { rig, ring };
  }), [source, pickups, surfaceHeight, rings]);
  useEffect(() => () => { rings.geometry.dispose(); rings.material.dispose(); }, [rings]);
  useFrame((_, delta) => {
    if (!simulationBlocked()) clock.current += Math.min(delta, .1);
    for (const { rig, ring } of rigs) { rig.update(clock.current); const radius = rig.radius(clock.current); ring.scale.set(radius, radius, 1); }
  });
  return <>{rigs.map(({rig}) => <primitive key={rig.root.name} object={rig.root} dispose={null}/>)}</>;
}
