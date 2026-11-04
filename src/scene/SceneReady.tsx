import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { SCENE_STALLED_ERROR, useExpeditionStore } from '../state/useExpeditionStore';
import type { OfficeWorld } from '../world/createOfficeMap';

/** Último filho da cena: só monta depois dos GLBs. Dois quadros garantem shaders e texturas já enviados. */
export function SceneReady({ world }: { world: OfficeWorld }) {
    const frames = useRef(0);
    useEffect(() => { frames.current = 0; }, [world]);
    useFrame(() => {
        if (frames.current > 2) return;
        if (++frames.current <= 2) return;
        const state = useExpeditionStore.getState();
        state.setReady(true);
        if (state.error === SCENE_STALLED_ERROR) state.setError(null);
    });
    return null;
}
