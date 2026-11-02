import { InteractionBubble } from '../../interactions/InteractionBubble';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen(value => !value), []), close = useCallback(() => setOpen(false), []);
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
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, []);
    useFrame((_, delta) => {
        const blocked = simulationBlocked();
        runtime.current?.update(playerPosition, blocked ? 0 : delta);
    });
    return <><group name="Laboratorio"><group ref={visual} position={[LABORATORIO.placement.x, 0, LABORATORIO.placement.z]} dispose={null}/>
        <InteractionBubble id="synthesizer" label="Sintetizadora de diamantes" point={LABORATORIO.console}
            position={[LABORATORIO.console.x, 1.8, LABORATORIO.console.z]} radius={LABORATORIO.console.radius}
            priority={40} onInteract={toggle} onHide={close}>
            {open && <><p>Controle visual da máquina</p><p>Estado: {modes.find(entry => entry.mode === mode)?.label}</p>
                {modes.map(entry => <button key={entry.mode} disabled={blocked} onClick={() => { if (simulationBlocked()) return; runtime.current?.setMode(entry.mode); setMode(entry.mode); }}>{entry.label}</button>)}
                <p style={{ fontSize: 11 }}>Prévia de animações. Produção e recursos serão definidos no ciclo da máquina.</p>
            </>}
        </InteractionBubble>
    </group><group ref={walkways} name="LaboratorioPassarelas" position={[LABORATORIO.placement.x, 0, LABORATORIO.placement.z]} dispose={null}/></>;
}
