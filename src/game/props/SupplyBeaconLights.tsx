import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { PointLight } from 'three';
import type { Pickup, SupplyCrate } from '../../combat/simulation';
import { playerPosition } from '../../state/playerTransient';
import { SUPPLY_LIGHTING, SupplyLightPool } from './supplyLighting';
const zero = () => 0;
export function SupplyBeaconLights({ kits, crates, height = zero }: { kits: Pickup[]; crates: SupplyCrate[]; height?: (x: number, z: number) => number }) {
  const pool = useMemo(() => new SupplyLightPool(kits, crates, height), [kits, crates, height]);
  const lights = useMemo(() => Array.from({ length: SUPPLY_LIGHTING.maxLights }, () => {
    const light = new PointLight('#ffffff', 0, SUPPLY_LIGHTING.reach, 2); light.castShadow = false; return light;
  }), []);
  useFrame(() => {
    pool.update(playerPosition);
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i], index = pool.selected[i]; light.intensity = index >= 0 ? SUPPLY_LIGHTING.intensity : 0;
      if (index >= 0) { const p = pool.sources[index]; light.position.set(p.x, p.y, p.z); light.color.copy(p.color); }
    }
  });
  return <>{lights.map(light => <primitive key={light.uuid} object={light} dispose={null}/>)}</>;
}
