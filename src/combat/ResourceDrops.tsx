import { createGroundRingMaterial } from './groundRingMaterial';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Matrix4, Quaternion, RingGeometry, Vector3, type InstancedMesh } from 'three';
import type { ResourceDrop } from './simulation';
import { simulationBlocked } from '../game/simulationGate';
import { ResourceRig } from './resourceRig';
import { RESOURCE_KINDS, RESOURCE_VISUAL, resourcePhase, resourceRingRadius, type ResourceKind } from './resourceVisual';
import copperUrl from '../assets/props/cobre.glb';
import ironUrl from '../assets/props/ferro.glb';
import organicUrl from '../assets/props/materia-organica.glb';
import titaniumUrl from '../assets/props/titanio.glb';


/** Uma geometria, três materiais/batches de anéis; GLBs e animações compartilhados por tipo. */
export function ResourceDrops({ drops }: { drops: ResourceDrop[] }) {
    const copper = useGLTF(copperUrl), iron = useGLTF(ironUrl), titanium = useGLTF(titaniumUrl), organic = useGLTF(organicUrl);
    const rings = useRef<Partial<Record<ResourceKind, InstancedMesh | null>>>({});
    const clock = useRef(0);
    const counts = useMemo(() => ({ titanium: 0, copper: 0, iron: 0, organic: 0 }), []);
    const pose = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), scale: new Vector3(), rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2) }), []);
    const ground = useMemo(() => ({ geometry: new RingGeometry(0, 1, 64), materials: {
        titanium: createGroundRingMaterial(RESOURCE_VISUAL.colors.titanium), copper: createGroundRingMaterial(RESOURCE_VISUAL.colors.copper), iron: createGroundRingMaterial(RESOURCE_VISUAL.colors.iron), organic: createGroundRingMaterial(RESOURCE_VISUAL.colors.organic),
    } }), []);
    const rigs = useMemo(() => drops.map((_, i) => ({
        copper: new ResourceRig(copper.scene, copper.animations, resourcePhase(i, 'copper')),
        iron: new ResourceRig(iron.scene, iron.animations, resourcePhase(i, 'iron')),
        titanium: new ResourceRig(titanium.scene, titanium.animations, resourcePhase(i, 'titanium')),
        organic: new ResourceRig(organic.scene, organic.animations, resourcePhase(i, 'organic')),
    })), [drops, copper, iron, titanium, organic]);
    useEffect(() => () => { for (const r of rigs) for (const kind of RESOURCE_KINDS) r[kind].dispose(); }, [rigs]);
    useEffect(() => () => { ground.geometry.dispose(); for (const kind of RESOURCE_KINDS) ground.materials[kind].dispose(); }, [ground]);
    useFrame((_, delta) => {
        const dt = simulationBlocked() ? 0 : Math.min(delta, .1);
        if (dt === 0) return;
        clock.current += dt;
        counts.iron = counts.copper = counts.titanium = counts.organic = 0;
        for (let i = 0; i < drops.length; i++) {
            const drop = drops[i], rig = rigs[i];
            for (const kind of RESOURCE_KINDS) {
                const matches = kind === 'organic' ? drop.kind === 'organic' : kind === 'titanium' ? drop.kind === 'titanium' : drop.kind === 'metals';
                const item = rig[kind], x = drop.x + (kind === 'copper' ? RESOURCE_VISUAL.metalOffset : kind === 'iron' ? -RESOURCE_VISUAL.metalOffset : 0);
                const surfaceY = kind === 'organic' ? drop.surfaceOrganic : kind === 'copper' ? drop.surfaceCopper : kind === 'iron' ? drop.surfaceIron : drop.surfaceTitanium;
                item.root.position.x = x; item.root.position.z = drop.z;
                item.update(drop.active && matches, dt, drop.spawned && matches, surfaceY);
                if (drop.active && matches) {
                    const radius = resourceRingRadius(clock.current, resourcePhase(i, kind));
                    pose.position.set(x, surfaceY + RESOURCE_VISUAL.ringY, drop.z); pose.scale.set(radius, radius, 1);
                    pose.matrix.compose(pose.position, pose.rotation, pose.scale);
                    rings.current[kind]?.setMatrixAt(counts[kind]++, pose.matrix);
                }
            }
        }
        for (const kind of RESOURCE_KINDS) {
            const mesh = rings.current[kind];
            if (mesh) { mesh.count = counts[kind]; mesh.instanceMatrix.needsUpdate = true; }
        }
    });
    return <>{rigs.map((rig, i) => <group key={i}>
      <primitive object={rig.iron.root} dispose={null}/><primitive object={rig.copper.root} dispose={null}/><primitive object={rig.titanium.root} dispose={null}/><primitive object={rig.organic.root} dispose={null}/>
    </group>)}
    {RESOURCE_KINDS.map(kind => <instancedMesh key={kind} name={`ResourceRing-${kind}`} ref={mesh => { rings.current[kind] = mesh; if (mesh) mesh.count = 0; }}
        args={[ground.geometry, ground.materials[kind], drops.length]} frustumCulled={false} dispose={null}/>)}
    </>;
}
