import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { simulationBlocked, useSimulationBlocked } from '../game/simulationGate';
import { playerPosition } from '../state/playerTransient';
import type { NpcConfig } from '../game/config';
import { activateWorldInteraction, interactionTargets } from './runtime';
interface InteractionBubbleProps {
    id: string; label: string; position: [number, number, number]; point: { x: number; z: number }; radius: number;
    priority?: number; available?: () => boolean; onInteract: () => void; onHide?: () => void; children?: ReactNode;
}
/** Mesmo balão da Sintetizadora para qualquer objeto/NPC: surge só na proximidade ativa. */
export function InteractionBubble({ id, label, position, point, radius, priority = 20, available, onInteract, onHide, children }: InteractionBubbleProps) {
    const [visible, setVisible] = useState(false), wasVisible = useRef(false), blocked = useSimulationBlocked();
    const target = useMemo(() => ({ id, x: point.x, z: point.z, radius, priority, available, onInteract }),
        [id, point.x, point.z, radius, priority, available, onInteract]);
    useLayoutEffect(() => interactionTargets.register(target), [target]);
    useFrame(() => {
        const next = !simulationBlocked() && interactionTargets.select(playerPosition) === target;
        if (next !== wasVisible.current) {
            wasVisible.current = next; setVisible(next);
            if (!next) onHide?.();
        }
    });
    if (!visible || blocked) return null;
    return <Html position={position} center zIndexRange={[6, 4]}>
        <aside className="interaction-bubble" aria-label={label} onPointerDown={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}>
            <button type="button" onClick={event => { event.stopPropagation(); activateWorldInteraction(id); }}>E · {label}</button>
            {children}
        </aside>
    </Html>;
}
/** Futuro NPC usa este componente, sua configuração local e seu callback de conversa. */
export function NpcInteractionBubble({ npc, height = 1.8, onInteract }: { npc: NpcConfig; height?: number; onInteract: () => void }) {
    return <InteractionBubble id={`npc:${npc.id}`} label={`Conversar com ${npc.name}`} point={npc.position}
        position={[npc.position.x, npc.position.y + height, npc.position.z]} radius={npc.interactionRadius} priority={30} onInteract={onInteract}/>;
}
