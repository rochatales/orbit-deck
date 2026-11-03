import { create } from 'zustand';
import type { PlayerAssetVariant } from '../characterAssetConfig';

/** Troca só o visual: query string e seletor preservam corpo, câmera, luz e controles. */
export function varianteInicial(search = globalThis.location?.search ?? ''): PlayerAssetVariant {
    try {
        const variant = new URLSearchParams(search).get('personagem');
        return variant === 'r7' || variant === 'atual' ? variant : 'astronauta';
    }
    catch {
        return 'astronauta';
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
