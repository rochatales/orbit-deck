import { create } from 'zustand';
import type { PlayerAssetVariant } from '../characterAssetConfig';

/**
 * Qual GLB o player usa (S2.12): a prévia começa com o Explorador r7. `?personagem=atual`
 * abre com o GLB ativo anterior, para comparar no mesmo ponto, câmera e luz. Só o visual
 * muda: corpo físico, colisor e controle são os mesmos.
 */
function varianteInicial(): PlayerAssetVariant {
    try {
        return new URLSearchParams(globalThis.location?.search ?? '').get('personagem') === 'atual' ? 'atual' : 'r7';
    }
    catch {
        return 'r7';
    }
}

/** Controle de comparação visível em desenvolvimento ou com `?comparar` na prévia. */
export function comparacaoDisponivel(): boolean {
    try {
        return Boolean(import.meta.env?.DEV) || new URLSearchParams(globalThis.location?.search ?? '').has('comparar');
    }
    catch {
        return false;
    }
}

interface PlayerAssetState {
    variant: PlayerAssetVariant;
    /** Clipes efetivamente carregados do GLB em uso (indicação explícita na prévia). */
    clips: string[];
    setVariant: (variant: PlayerAssetVariant) => void;
    setClips: (clips: string[]) => void;
}

export const usePlayerAsset = create<PlayerAssetState>((set, get) => ({
    variant: varianteInicial(),
    clips: [],
    setVariant: (variant) => { if (get().variant !== variant) set({ variant, clips: [] }); },
    setClips: (clips) => {
        const atual = get().clips;
        if (atual.length !== clips.length || atual.some((c, i) => c !== clips[i])) set({ clips });
    }
}));
