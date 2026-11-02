export interface InteractionTarget {
    id: string; x: number; z: number; radius: number; priority: number;
    available?: () => boolean;
    onInteract: () => void;
}
/** Registro só muda na montagem; seleção lê posição/estado atuais sem criar objetos no quadro. */
export class InteractionRegistry {
    private targets: InteractionTarget[] = [];
    register(target: InteractionTarget) {
        if (this.targets.some(t => t.id === target.id)) throw new Error(`Interação duplicada: ${target.id}`);
        this.targets.push(target);
        return () => { const at = this.targets.indexOf(target); if (at >= 0) this.targets.splice(at, 1); };
    }
    select(player: { x: number; z: number }): InteractionTarget | null {
        let best: InteractionTarget | null = null, bestDistance = Infinity;
        if (!Number.isFinite(player.x + player.z)) return null;
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i], dx = player.x - target.x, dz = player.z - target.z, distance = dx * dx + dz * dz;
            if (distance > target.radius * target.radius || (target.available && !target.available())) continue;
            if (!best || target.priority > best.priority || (target.priority === best.priority && distance < bestDistance)) {
                best = target; bestDistance = distance;
            }
        }
        return best;
    }
    activate(player: { x: number; z: number }, expectedId?: string) {
        const target = this.select(player);
        if (!target || (expectedId !== undefined && target.id !== expectedId)) return false;
        target.onInteract(); return true;
    }
}
