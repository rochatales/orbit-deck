import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { bindSharedFloorPower } from './colonyPower';
import url from '../../assets/buildings/colony-shared-floor-v001.glb';
/** Pavimento da colônia, plano e contínuo; independe dos prédios e do corte dos tetos. */
export function ColonySharedFloor() {
    const gltf = useGLTF(url), root = useRef<Group>(null), power = useRef<() => void>();
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true);
        scene.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.receiveShadow = true; mesh.castShadow = false; } });
        const bound = bindSharedFloorPower(scene);
        bound.update(); power.current = bound.update;
        root.current!.add(scene);
        return () => { power.current = undefined; scene.removeFromParent(); bound.dispose(); };
    }, [gltf.scene]);
    useFrame(() => power.current?.());
    return <group ref={root} name="ColonySharedFloor" dispose={null}/>;
}
