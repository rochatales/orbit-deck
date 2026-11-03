import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useRef } from 'react';
import type { Group, Mesh } from 'three';
import url from '../../assets/buildings/colony-shared-floor-v001.glb';
/** Pavimento da colônia, plano e contínuo; independe dos prédios e do corte dos tetos. */
export function ColonySharedFloor() {
    const gltf = useGLTF(url), root = useRef<Group>(null);
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true);
        scene.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.receiveShadow = true; mesh.castShadow = false; } });
        root.current!.add(scene);
        return () => { scene.removeFromParent(); };
    }, [gltf.scene]);
    return <group ref={root} name="ColonySharedFloor" dispose={null}/>;
}
