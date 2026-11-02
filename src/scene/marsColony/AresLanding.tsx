import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { type Mesh, type Material } from 'three';
import shipUrl from '../../assets/ares-lander/ares-lander.glb';
import deckUrl from '../../assets/ares-mars/deck-mars.glb';
import { prepareAresVisual } from '../../game/aresVisual';
import { MARS_ARES } from '../../game/marsLanding';

/** Cópias visuais: materiais privados, geometrias do cache, nenhuma física de malha. */
export function AresLanding() {
    const [shipSource, deckSource] = useGLTF([shipUrl, deckUrl]);
    const { ship, deck, materials } = useMemo(() => {
        const materials: Material[] = [];
        const privateCopy = (source: typeof shipSource.scene) => {
            const copy = source.clone(true);
            copy.traverse(node => {
                const mesh = node as Mesh;
                if (!mesh.isMesh) return;
                const clone = (material: Material) => { const own = material.clone(); materials.push(own); return own; };
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
                mesh.castShadow = !mesh.userData.emissivo;
                mesh.receiveShadow = !mesh.userData.emissivo;
                if (mesh.userData.emissivo) {
                    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.toneMapped = false;
                }
            });
            return copy;
        };
        const ship = privateCopy(shipSource.scene), deck = privateCopy(deckSource.scene);
        prepareAresVisual(ship, { position: MARS_ARES.position, name: 'MarsARES', impact: false });
        deck.name = 'MarsARESDeck';
        deck.position.set(MARS_ARES.deck.x, MARS_ARES.deck.y, MARS_ARES.deck.z);
        return { ship, deck, materials };
    }, [shipSource.scene, deckSource.scene]);
    useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
    return <><primitive object={deck} dispose={null} /><primitive object={ship} dispose={null} /></>;
}
