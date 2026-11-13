import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Pickup, SupplyCrate } from '../../combat/simulation';
import { SUPPLY_CRATE } from '../props/supplyCrate';

export function RioSupplyVisuals({ pickups, crates }: { pickups: Pickup[]; crates: SupplyCrate[] }) {
    const kits = useRef<(Group | null)[]>([]), lids = useRef<(Group | null)[]>([]);
    useFrame(() => {
        for (let i = 0; i < pickups.length; i++) {
            const kit = kits.current[i];
            if (kit) kit.visible = pickups[i].active;
        }
        for (let i = 0; i < crates.length; i++) {
            const lid = lids.current[i];
            if (lid) lid.rotation.x = -1.3 * Math.min(1, crates[i].elapsed / SUPPLY_CRATE.rewardAt);
        }
    });
    return <>
        {pickups.map(({ x, z }, i) => <group key={i} ref={node => { kits.current[i] = node; }} position={[x, .22, z]}>
            <mesh castShadow><boxGeometry args={[.7, .44, .56]}/><meshStandardMaterial color="#f4efe4"/></mesh>
            <mesh position={[0, .226, 0]}><boxGeometry args={[.32, .012, .095]}/><meshStandardMaterial color="#c64338"/></mesh>
            <mesh position={[0, .228, 0]}><boxGeometry args={[.095, .012, .32]}/><meshStandardMaterial color="#c64338"/></mesh>
        </group>)}
        {crates.map(({ id, x, z, angle }, i) => <group key={id} position={[x, 0, z]} rotation-y={angle ?? 0}>
            <mesh position={[0, .57, 0]} castShadow><boxGeometry args={[1.8, 1.14, 2]}/><meshStandardMaterial color="#b78d37"/></mesh>
            <mesh position={[0, 1.15, 0]}><boxGeometry args={[1.42, .06, 1.63]}/><meshStandardMaterial color="#146671" emissive={SUPPLY_CRATE.neon} emissiveIntensity={.65}/></mesh>
            <group position={[0, 1.24, -1]} ref={node => { lids.current[i] = node; }}>
                <mesh position={[0, 0, 1]} castShadow><boxGeometry args={[1.8, .16, 2]}/><meshStandardMaterial color="#e6b956"/></mesh>
            </group>
        </group>)}
    </>;
}
