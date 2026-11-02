import { AudioFrame } from '../audio/AudioRuntime';
import { releaseMovementKeys } from '../game/simulationGate';
import { useGameStore } from '../state/useGameStore';
import { KeyboardControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, lazy, useEffect, useState } from 'react';
import { OfficeScene } from '../scene/OfficeScene';
import { KEYBOARD_CONTROLS_MAP } from '../controls/keyboardControls';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { MapId } from '../game/session';
// S2.9: instrumentação só é baixada e montada com `?perf` na URL. A regra é a mesma de
// `isPerfEnabled` (src/dev/perf/perfMetrics.ts), repetida aqui para não incluir o módulo no bundle principal.
const isPerfEnabled = (search: string) => new URLSearchParams(search).has('perf');
const PerfProbe = lazy(() => import('../dev/perf/PerfProbe').then(m => ({ default: m.PerfProbe })));
const PerfPanel = lazy(() => import('../dev/perf/PerfProbe').then(m => ({ default: m.PerfPanel })));
export function GameCanvas({ world, map }: {
    world: OfficeWorld;
    map: MapId;
}) {
    const [perf] = useState(() => isPerfEnabled(window.location.search));
    useEffect(() => {
        const release = () => { releaseMovementKeys(); useGameStore.setState({ isPaused: true }); };
        const hidden = () => { if (document.hidden) release(); };
        const unsubscribe = useGameStore.subscribe((state,previous) => { if(state.isPaused && !previous.isPaused) releaseMovementKeys(); });
        window.addEventListener('blur', release);
        document.addEventListener('visibilitychange', hidden);
        return () => { unsubscribe(); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', hidden); };
    }, []);
    return <KeyboardControls map={KEYBOARD_CONTROLS_MAP}>
    <Canvas className={`game-canvas ${map === "shanghai" ? "combat-canvas" : ""}`} shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
      <Suspense fallback={null}><OfficeScene world={world} map={map}/></Suspense>
      <AudioFrame/>
      {perf && <Suspense fallback={null}><PerfProbe map={map}/></Suspense>}
    </Canvas>
    {perf && <Suspense fallback={null}><PerfPanel map={map}/></Suspense>}
  </KeyboardControls>;
}
