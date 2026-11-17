import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import type { Material, Mesh } from 'three';
import shipUrl from '../assets/ares-lander/ares-lander.glb';
import { prepareAresVisual } from '../game/aresVisual';
import { RIO_ARES_POSITION } from '../game/rio/layout';

export function RioAresLanding() {
    const { scene } = useGLTF(shipUrl);
    const { ship, materials } = useMemo(() => {
        const ship = scene.clone(true);
        const materials = new Map<Material, Material>();
        const own = (source: Material) => {
            let copy = materials.get(source);
            if (!copy) {
                copy = source.clone();
                materials.set(source, copy);
            }
            return copy;
        };
        ship.traverse(node => {
            const mesh = node as Mesh;
            if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
        });
        prepareAresVisual(ship, { position: RIO_ARES_POSITION, name: 'RioARES', impact: false });
        return { ship, materials };
    }, [scene]);
    useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
    return <primitive object={ship} dispose={null}/>;
}
