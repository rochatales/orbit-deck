import { Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Group, SkinnedMesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked, useSimulationBlocked } from '../../game/simulationGate';
import { LABORATORIO } from '../../game/laboratorioLayout';
import type { OfficeWorld } from '../../world/createOfficeMap';
import url from '../../assets/laboratorio/laboratorio-v002.glb';
import { createLaboratorioWalkways } from './laboratorioWalkways';
import { LaboratorioRuntime, type LaboratorioMode } from './laboratorioRuntime';
const modes: { mode: LaboratorioMode; label: string }[] = [
    { mode: 'Idle_Ready', label: 'Pronta' }, { mode: 'Synthesizing', label: 'Sintetizar' },
    { mode: 'Drawer_Dispense', label: 'Abrir gaveta' }, { mode: 'Standby_PowerDown', label: 'Espera' }
];
export function Laboratorio({ world }: { world: OfficeWorld }) {
    const gltf = useGLTF(url), visual = useRef<Group>(null), runtime = useRef<LaboratorioRuntime>();
    const walkways = useRef<Group>(null), blocked = useSimulationBlocked();
    const near = useRef(false), [available, setAvailable] = useState(false), [open, setOpen] = useState(false);
    const [mode, setMode] = useState<LaboratorioMode>('Idle_Ready');
    useLayoutEffect(() => {
        const scene = clone(gltf.scene); scene.name = 'LaboratorioVisual';
        const next = new LaboratorioRuntime(scene, gltf.animations, world.movingCuboids);
        runtime.current = next; visual.current!.add(scene);
        const paving = createLaboratorioWalkways(scene); walkways.current!.add(paving);
        return () => {
            paving.removeFromParent();
            scene.removeFromParent(); next.dispose(); runtime.current = undefined;
            scene.traverse(node => { const mesh = node as SkinnedMesh; if (mesh.isSkinnedMesh) mesh.skeleton.dispose(); });
        };
    }, [gltf.scene, gltf.animations, world]);
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            if (event.code === 'Escape') setOpen(false);
            if (event.code === 'KeyE' && !event.repeat && near.current && !simulationBlocked()) setOpen(value => !value);
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, []);
    useFrame((_, delta) => {
        const blocked = simulationBlocked();
        runtime.current?.update(playerPosition, blocked ? 0 : delta);
        const c = LABORATORIO.console, dx = playerPosition.x - c.x, dz = playerPosition.z - c.z;
        const next = dx * dx + dz * dz < c.radius * c.radius;
        if (near.current !== next) { near.current = next; setAvailable(next); if (!next) setOpen(false); }
    });
    return <><group name="Laboratorio"><group ref={visual} position={[LABORATORIO.placement.x, 0, LABORATORIO.placement.z]} dispose={null}/>
        {available && !blocked && <Html position={[LABORATORIO.console.x, 1.8, LABORATORIO.console.z]} center zIndexRange={[6, 4]}>
            <aside aria-label="Sintetizadora de diamantes" style={{ width: 235, padding: 12, background: '#20282ded', color: '#eee4cd', border: '1px solid #8bc9cc', borderRadius: 8 }}>
                <button onClick={() => setOpen(value => !value)}>E · Sintetizadora de diamantes</button>
                {open && <><p>Controle visual da máquina</p><p>Estado: {modes.find(entry => entry.mode === mode)?.label}</p>
                    {modes.map(entry => <button key={entry.mode} disabled={simulationBlocked()} onClick={() => { if (simulationBlocked()) return; runtime.current?.setMode(entry.mode); setMode(entry.mode); }}>{entry.label}</button>)}
                    <p style={{ fontSize: 11 }}>Prévia de animações. Produção e recursos serão definidos no ciclo da máquina.</p>
                </>}
            </aside>
        </Html>}
    </group><group ref={walkways} name="LaboratorioPassarelas" position={[LABORATORIO.placement.x, 0, LABORATORIO.placement.z]} dispose={null}/></>;
}
