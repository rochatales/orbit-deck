import type { Pickup } from '../combat/simulation';
import { MEDICAL_KIT } from '../game/props/medicalKit';
import { collectMedicalKit } from '../game/props/medicalKitInteraction';
import { playerPosition } from '../state/playerTransient';
import { combatRuntime } from '../state/useCombatStore';
import { InteractionBubble } from './InteractionBubble';

/** Usa os itens reais da tentativa; também preserva os encontros do blockout de comparação. */
export function MedicalKitBubbles({ pickups, height }: { pickups: Pickup[]; height?: (x: number, z: number) => number }) {
  return <>{pickups.map((kit, i) => <InteractionBubble key={i} id={`medical-kit:${i}`}
    label="Coletar kit médico · usar com 3" point={kit} radius={MEDICAL_KIT.interactionRadius} priority={30}
    position={[kit.x, (height?.(kit.x, kit.z) ?? 0) + .9, kit.z]}
    available={() => kit.active && combatRuntime.simulation?.nearbyMedicalKit(playerPosition) === kit}
    onInteract={collectMedicalKit}/>)}</>;
}
