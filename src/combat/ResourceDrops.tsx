import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Matrix4, type InstancedMesh } from 'three';
import type { ResourceDrop } from './simulation';
import { simulationBlocked } from '../game/simulationGate';
import { ResourceRig } from './resourceRig';
import copperUrl from '../assets/props/cobre.glb';
import ironUrl from '../assets/props/ferro.glb';

/** GLBs compartilhados; skeleton/mixer próprios por drop, sem colisores de malha. */
export function ResourceDrops({ drops }: { drops: ResourceDrop[] }) {
    const copper = useGLTF(copperUrl), iron = useGLTF(ironUrl);
    const titaniumBase = useRef<InstancedMesh>(null), titaniumTop = useRef<InstancedMesh>(null);
    const matrix = useMemo(() => new Matrix4(), []);
    const rigs = useMemo(() => drops.map(() => ({
        copper: new ResourceRig(copper.scene, copper.animations, .03),
        iron: new ResourceRig(iron.scene, iron.animations, .01),
    })), [drops, copper, iron]);
    useEffect(() => () => rigs.forEach(r => { r.copper.dispose(); r.iron.dispose(); }), [rigs]);
    useFrame((_, delta) => {
        const dt = simulationBlocked() ? 0 : Math.min(delta, .1);
        if (dt === 0) return;
        let titaniumCount = 0;
        for (let i = 0; i < drops.length; i++) {
            const drop = drops[i], rig = rigs[i], metals = drop.kind === 'metals';
            rig.copper.root.position.x = drop.x + .42; rig.copper.root.position.z = drop.z;
            rig.iron.root.position.x = drop.x - .42; rig.iron.root.position.z = drop.z;
            rig.copper.update(drop.active && metals, dt, drop.spawned && metals); rig.iron.update(drop.active && metals, dt, drop.spawned && metals);
            if (drop.active && !metals) {
                matrix.makeRotationY(.3).setPosition(drop.x, .18, drop.z);
                titaniumBase.current?.setMatrixAt(titaniumCount, matrix);
                matrix.makeRotationY(-.3).setPosition(drop.x + .1, .36, drop.z);
                titaniumTop.current?.setMatrixAt(titaniumCount++, matrix);
            }
        }
        if (titaniumBase.current) { titaniumBase.current.count = titaniumCount; titaniumBase.current.instanceMatrix.needsUpdate = true; }
        if (titaniumTop.current) { titaniumTop.current.count = titaniumCount; titaniumTop.current.instanceMatrix.needsUpdate = true; }
    });
    return <>{rigs.map((rig, i) => <group key={i}>
      <primitive object={rig.iron.root} dispose={null}/><primitive object={rig.copper.root} dispose={null}/>
    </group>)}
    {/* Sem GLB de titânio fornecido: lingotes provisórios, no máximo duas draw calls. */}
    <instancedMesh name="TitaniumDrops" ref={titaniumBase} args={[undefined, undefined, drops.length]} frustumCulled={false} castShadow>
      <boxGeometry args={[.55,.24,.32]}/><meshStandardMaterial color="#a5afc8" metalness={.85} roughness={.25}/>
    </instancedMesh>
    <instancedMesh ref={titaniumTop} args={[undefined, undefined, drops.length]} frustumCulled={false} castShadow>
      <boxGeometry args={[.42,.14,.22]}/><meshStandardMaterial color="#9c81dd" metalness={.8} roughness={.3} emissive="#40315c" emissiveIntensity={.25}/>
    </instancedMesh>
    </>;
}
