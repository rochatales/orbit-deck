import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { useCampaignStore } from '../../state/useCampaignStore';

/** Chamar após o runtime criar os materiais privados. A energia muda por evento do save. */
export function bindColonyPower(scene: Object3D, flag: 'edenActive' | 'synthesizerActive', onPower?: (powered: boolean) => void) {
    const powered = (state: ReturnType<typeof useCampaignStore.getState>) => state.mode !== 'campaign' || !!state.saved?.campaign[flag];
    if (useCampaignStore.getState().mode !== 'campaign') return undefined;
    const emissives = new Map<MeshStandardMaterial, number>();
    scene.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const standard = material as MeshStandardMaterial;
            if (standard.isMeshStandardMaterial && standard.emissiveIntensity > 0 && standard.emissive.getHex() !== 0)
                emissives.set(standard, standard.emissiveIntensity);
        }
    });
    const apply = (active: boolean) => {
        for (const [material, intensity] of emissives) material.emissiveIntensity = active ? intensity : 0;
        onPower?.(active);
    };
    apply(powered(useCampaignStore.getState()));
    return useCampaignStore.subscribe((state, previous) => {
        const active = powered(state);
        if (active !== powered(previous)) apply(active);
    });
}
