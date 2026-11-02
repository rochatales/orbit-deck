import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { Pickup } from './simulation';
import { createMedkitRig } from './healthPickupRig';
import medkitUrl from '../assets/props/shanghai/medkit.glb';

export function HealthPickups({ pickups, surfaceHeight }: { pickups: Pickup[]; surfaceHeight?: (x: number, z: number) => number }) {
  const source = useGLTF(medkitUrl);
  const rigs = useMemo(() => pickups.map((pickup, i) => createMedkitRig(source.scene, pickup, surfaceHeight?.(pickup.x, pickup.z) ?? 0, i)), [source, pickups, surfaceHeight]);
  useEffect(() => () => rigs.forEach(rig => rig.dispose()), [rigs]);
  useFrame(() => { for (const rig of rigs) rig.update(); });
  return <>{rigs.map(rig => <primitive key={rig.root.name} object={rig.root} dispose={null}/>)}</>;
}
