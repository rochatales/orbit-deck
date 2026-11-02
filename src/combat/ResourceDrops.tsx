import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Color, Matrix4, Quaternion, RingGeometry, ShaderMaterial, Vector3, type InstancedMesh } from 'three';
import type { ResourceDrop } from './simulation';
import { simulationBlocked } from '../game/simulationGate';
import { ResourceRig } from './resourceRig';
import { RESOURCE_KINDS, RESOURCE_VISUAL, resourcePhase, resourceRingRadius, type ResourceKind } from './resourceVisual';
import copperUrl from '../assets/props/cobre.glb';
import ironUrl from '../assets/props/ferro.glb';
import organicUrl from '../assets/props/materia-organica.glb';
import titaniumUrl from '../assets/props/titanio.glb';

function ringMaterial(kind: ResourceKind) {
    return new ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false,
        uniforms: { color: { value: new Color(RESOURCE_VISUAL.colors[kind]) } },
        vertexShader: `varying vec2 ground;
            void main() { ground = position.xy; vec4 p = vec4(position, 1.0);
            #ifdef USE_INSTANCING
                p = instanceMatrix * p;
            #endif
                gl_Position = projectionMatrix * modelViewMatrix * p; }`,
        fragmentShader: `uniform vec3 color; varying vec2 ground;
            void main() { float d = abs(length(ground) - 0.76);
                float thin = 1.0 - smoothstep(0.009, 0.026, d);
                float halo = 0.24 * exp(-d * d / 0.012);
                float a = min(0.95, thin + halo); if (a < 0.003) discard;
                gl_FragColor = vec4(color * (1.0 + thin * 0.7), a);
                #include <colorspace_fragment>
            }`,
    });
}

/** Uma geometria, três materiais/batches de anéis; GLBs e animações compartilhados por tipo. */
export function ResourceDrops({ drops }: { drops: ResourceDrop[] }) {
    const copper = useGLTF(copperUrl), iron = useGLTF(ironUrl), titanium = useGLTF(titaniumUrl), organic = useGLTF(organicUrl);
    const rings = useRef<Partial<Record<ResourceKind, InstancedMesh | null>>>({});
    const clock = useRef(0);
    const counts = useMemo(() => ({ titanium: 0, copper: 0, iron: 0, organic: 0 }), []);
    const pose = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), scale: new Vector3(), rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2) }), []);
    const ground = useMemo(() => ({ geometry: new RingGeometry(0, 1, 64), materials: {
        titanium: ringMaterial('titanium'), copper: ringMaterial('copper'), iron: ringMaterial('iron'), organic: ringMaterial('organic'),
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
