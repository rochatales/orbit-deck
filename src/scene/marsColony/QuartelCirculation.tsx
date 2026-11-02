import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useRef } from 'react';
import type { Group, Mesh } from 'three';
import url from '../../assets/quartel/quartel-circulation-v001.glb';
/** Piso externo permanece fora do pai de descarte do quartel; materiais no cache GLB. */
export function QuartelCirculation() {
    const gltf = useGLTF(url), root = useRef<Group>(null);
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true);
        scene.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) mesh.receiveShadow = true; });
        root.current!.add(scene);
        return () => { scene.removeFromParent(); };
    }, [gltf.scene]);
    return <group ref={root} name="QuartelCirculation" dispose={null}/>;
}
