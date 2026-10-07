import { simulationBlocked } from '../game/simulationGate';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { OrthographicCamera as Camera, Vector3 } from 'three';
import { useGameStore } from '../state/useGameStore';
import { playerPosition } from '../state/playerTransient';
import { damp, dampAngle, type RectBounds } from '../utils/math';
import type { Point } from '../game/config';
export function CameraRig({ bounds, spawn }: {
    bounds: RectBounds;
    spawn: Point;
}) {
    const ref = useRef<Camera>(null), keys = useRef(new Set<string>());
    const target = useRef(new Vector3(spawn.x, 0.55, spawn.z));
    const angle = useRef(Math.PI / 4);
    const size = useThree(s => s.size);
    const fit = Math.min(size.width / Math.max(35, (bounds.maxX - bounds.minX) * 0.8), size.height / Math.max(26, (bounds.maxZ - bounds.minZ) * 0.65));
    useEffect(() => { useGameStore.setState({ targetRotation: Math.PI / 4 }); useGameStore.getState().setZoomBounds(fit, fit * 3.25); useGameStore.getState().setZoom(fit * 1.6); }, [fit]);
    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
            return; if (!simulationBlocked()) keys.current.add(e.code); };
        const up = (e: KeyboardEvent) => { keys.current.delete(e.code); };
        const clear = () => keys.current.clear();
        const wheel = (e: WheelEvent) => { if (simulationBlocked() || !(e.target instanceof HTMLCanvasElement))
            return; e.preventDefault(); useGameStore.getState().adjustZoom(-Math.sign(e.deltaY) * fit * 0.1); };
        const offGame = useGameStore.subscribe(() => { if(simulationBlocked()) clear(); });
        const offExpedition = useExpeditionStore.subscribe(() => { if(simulationBlocked()) clear(); });
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', clear);
        window.addEventListener('wheel', wheel, { passive: false });
        return () => { offGame(); offExpedition(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); window.removeEventListener('wheel', wheel); };
    }, [fit]);
    useFrame((_, delta) => {
        const c = ref.current;
        if (!c)
            return;
        const dt = Math.min(delta, 0.05), s = useGameStore.getState();
        if (!simulationBlocked()) {
            if (keys.current.has('KeyQ'))
                s.rotateCamera(dt * 1.75);
            if (keys.current.has('KeyC'))
                s.rotateCamera(-dt * 1.75);
            if (keys.current.has('Equal'))
                s.adjustZoom(dt * fit);
            if (keys.current.has('Minus'))
                s.adjustZoom(-dt * fit);
        }
        angle.current = dampAngle(angle.current, s.targetRotation, 8, dt);
        c.zoom = damp(c.zoom, s.targetZoom, 8, dt);
        c.updateProjectionMatrix();
        target.current.x = damp(target.current.x, playerPosition.x, 6.5, dt);
        target.current.z = damp(target.current.z, playerPosition.z, 6.5, dt);
        c.position.set(target.current.x + Math.cos(angle.current) * 18.38, 13.55, target.current.z + Math.sin(angle.current) * 18.38);
        c.lookAt(target.current);
    });
    return <OrthographicCamera ref={ref} makeDefault position={[spawn.x + 13, 13.55, spawn.z + 13]} zoom={fit * 1.6} near={0.1} far={160}/>;
}
