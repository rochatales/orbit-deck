import { Html, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type Group } from 'three';
import { playerPosition } from '../../state/playerTransient';
import greenhouseUrl from '../../assets/greenhouse/greenhouse-v001.glb';
import manifest from '../../assets/greenhouse/greenhouse-v001.manifest.json';
import { GreenhouseRuntime, type GreenhouseState } from './greenhouseRuntime';

/** Prévia técnica explícita; não representa desbloqueio ou interação da progressão. */
function GreenhousePreview({ state, onChange }: { state: GreenhouseState; onChange: (state: GreenhouseState) => void }) {
    const size = useThree(state => state.size);
    const screenCenter = useMemo(() => [size.width / 2, size.height / 2], [size.width, size.height]);
    const calculatePosition = useCallback(() => screenCenter, [screenCenter]);
    return <Html fullscreen calculatePosition={calculatePosition} style={{ pointerEvents: 'none' }}><section data-testid="greenhouse-preview"
        aria-label="Prévia técnica da estufa" style={{ position: 'absolute', right: 20, top: 150, width: 245,
            padding: 16, color: '#eae3d8', background: '#15292ff2', border: '1px solid #5f9ea0', borderRadius: 8, pointerEvents: 'auto' }}
        onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <strong>ESTUFA · PRÉVIA TÉCNICA</strong>
        <p aria-live="polite">Estado: <output data-testid="greenhouse-state">{state}</output></p>
        <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" data-testid="greenhouse-offline" aria-pressed={state === 'OFFLINE'} onClick={event => { onChange('OFFLINE'); event.currentTarget.blur(); }}>Desativada · OFFLINE</button>
            <button type="button" data-testid="greenhouse-online" aria-pressed={state === 'ONLINE'} onClick={event => { onChange('ONLINE'); event.currentTarget.blur(); }}>Ativa · ONLINE</button>
        </div>
        <p style={{ fontSize: 12, marginBottom: 0 }}>Alternância de teste. O estado não é salvo.</p>
    </section></Html>;
}

/** Somente malha visual; os CuboidCollider vêm de marsWorld e não mudam com o estado. */
export function Greenhouse() {
    const gltf = useGLTF(greenhouseUrl);
    const [state, setState] = useState<GreenhouseState>('OFFLINE');
    const [preview] = useState(() => new URLSearchParams(window.location.search).has('greenhousePreview'));
    const visual = useRef<Group>(null);
    const runtime = useRef<GreenhouseRuntime>();
    // Criação no efeito: o ciclo montar/desmontar do StrictMode não perde as luzes nem vaza clones.
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true);
        scene.name = 'Greenhouse';
        const instance = new GreenhouseRuntime(scene, manifest);
        runtime.current = instance;
        visual.current!.add(scene);
        return () => { scene.removeFromParent(); instance.dispose(); runtime.current = undefined; };
    }, [gltf.scene]);
    useEffect(() => runtime.current?.setState(state), [gltf.scene, state]);
    useFrame((_, delta) => runtime.current?.update(playerPosition, delta));
    return <><group ref={visual} dispose={null} />{preview && <GreenhousePreview state={state} onChange={setState} />}</>;
}
