import { releaseMovementKeys } from '../game/simulationGate';
import { useGameStore } from '../state/useGameStore';
import { KeyboardControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { OfficeScene } from '../scene/OfficeScene';
import { KEYBOARD_CONTROLS_MAP } from '../controls/keyboardControls';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { MapId } from '../game/session';
export function GameCanvas({ world, map }: {
    world: OfficeWorld;
    map: MapId;
}) {
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
    </Canvas>
  </KeyboardControls>;
}
