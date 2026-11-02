import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import legacyUrl from '../../assets/colony-v006.glb';
import { createDeckProps } from './landingProps';

/** Geometrias/materiais do cache compartilhados e preservados; sem raycast/colisor de malha. */
export function DeckProps() {
    const gltf = useGLTF(legacyUrl);
    const props = useMemo(() => createDeckProps(gltf.scene), [gltf.scene]);
    return <primitive object={props} dispose={null} />;
}
