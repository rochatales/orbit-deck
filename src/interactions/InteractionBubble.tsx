import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { simulationBlocked, useSimulationBlocked } from '../game/simulationGate';
import { playerPosition } from '../state/playerTransient';
import type { NpcConfig } from '../game/config';
import { activateWorldInteraction, interactionTargets } from './runtime';
interface InteractionBubbleProps {
    id: string; label: string; position: [number, number, number]; point: { x: number; z: number }; radius: number;
    alwaysVisible?: boolean;
    priority?: number; available?: () => boolean; onInteract: () => void; onHide?: () => void; children?: ReactNode;
}
/** Mesmo balão da Sintetizadora para qualquer objeto/NPC: surge só na proximidade ativa. */
export function InteractionBubble({ id, label, position, point, radius, priority = 20, alwaysVisible = false, available, onInteract, onHide, children }: InteractionBubbleProps) {
    const [display, setDisplay] = useState(0), previousDisplay = useRef(0), blocked = useSimulationBlocked();
    const target = useMemo(() => ({ id, x: point.x, z: point.z, point, radius, priority, available, onInteract }),
        [id, point, radius, priority, available, onInteract]);
    useLayoutEffect(() => interactionTargets.register(target), [target]);
    useFrame(() => {
        const active = !simulationBlocked() && interactionTargets.select(playerPosition) === target;
        const next = simulationBlocked() ? 0 : active ? 2 : alwaysVisible ? 1 : 0;
        if (next !== previousDisplay.current) {
            previousDisplay.current = next; setDisplay(next);
            if (!next) onHide?.();
        }
    });
    if (!display || blocked) return null;
    return <Html position={position} center zIndexRange={[6, 4]}>
        <aside className="interaction-bubble" aria-label={label} onPointerDown={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}>
            {display === 2 ? <><button type="button" onClick={event => { event.stopPropagation(); activateWorldInteraction(id); }}>E · {label}</button>{children}</> : <span className="interaction-label">{label}</span>}
        </aside>
    </Html>;
}
/** Futuro NPC usa este componente, sua configuração local e seu callback de conversa. */
export function NpcInteractionBubble({ npc, height = 1.8, onInteract }: { npc: NpcConfig; height?: number; onInteract: () => void }) {
    return <InteractionBubble id={`npc:${npc.id}`} label={`Conversar com ${npc.name}`} point={npc.position}
        position={[npc.position.x, npc.position.y + height, npc.position.z]} radius={npc.interactionRadius} priority={30} onInteract={onInteract}/>;
}
