import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { PointLight } from 'three';
import type { SupplyCrate } from '../../combat/simulation';
import { SUPPLY_CRATE, revealIntensity } from './supplyCrate';
import { createLockerRig } from './lockerRig';
import crateUrl from '../../assets/props/shanghai/emergency-locker.glb';

/** Geometria/texturas compartilhadas; porta por instância, um único foco de revelação. */
export function SupplyCrates({ crates, surfaceHeight }: { crates: SupplyCrate[]; surfaceHeight?: (x: number, z: number) => number }) {
  const asset = useGLTF(crateUrl);
  const rigs = useMemo(() => crates.map(crate => createLockerRig(asset.scene, asset.animations, crate, surfaceHeight?.(crate.x, crate.z) ?? 0)), [asset, crates, surfaceHeight]);
  const light = useMemo(() => { const value = new PointLight(SUPPLY_CRATE.neon, 0, 5, 2); value.castShadow = false; return value; }, []);
  useEffect(() => () => { rigs.forEach(rig => rig.dispose()); light.dispose(); }, [rigs, light]);
  useFrame(() => {
    let brightest = 0;
    for (let i = 0; i < rigs.length; i++) {
      rigs[i].update();
      const value = crates[i].phase === 'opening' ? revealIntensity(crates[i]) * .15 : 0;
      if (value > brightest) { brightest = value; light.position.set(rigs[i].root.position.x, rigs[i].root.position.y + 1.1, rigs[i].root.position.z); }
    }
    light.intensity = brightest; light.visible = brightest > 0;
  });
  return <><primitive object={light} dispose={null}/>{rigs.map(rig => <primitive key={rig.root.name} object={rig.root} dispose={null}/>)}</>;
}
