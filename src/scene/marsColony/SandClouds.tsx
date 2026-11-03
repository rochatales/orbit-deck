import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { MARS_AUDIO_INTERIORS } from '../../audio/marsInterior';
import { simulationBlocked } from '../../game/simulationGate';
import type { SandwindSettings } from './SandwindController';
import { SandCloudVisual } from './sandCloudVisual';
import type { SandwindWind } from './sandwindWind';
export function SandClouds({ wind, settings }: { wind: SandwindWind; settings: () => SandwindSettings }) {
    const root = useRef<Group>(null), visual = useRef<SandCloudVisual>();
    useLayoutEffect(() => {
        const next = new SandCloudVisual(wind, MARS_AUDIO_INTERIORS);
        root.current!.add(next.mesh); visual.current = next;
        return () => { visual.current = undefined; next.dispose(); };
    }, [wind]);
    useFrame((_, dt) => {
        const s = settings(); visual.current?.update(dt, s.enabled, s.wind, simulationBlocked());
    });
    return <group ref={root} name="MarsSandCloudField"/>;
}
