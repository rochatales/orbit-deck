import type { RobotKind } from '../combat/config';
export type SoundEventType = 'shot' | 'reload' | 'playerStep' | 'enemyStep' | 'bulletHit' | 'death' | 'attack' | 'collect' | 'chargeWarning';
export interface SoundEvent { type: SoundEventType; kind: RobotKind; x: number; z: number }
/** Anel pré-alocado: nenhum objeto por evento da simulação/locomoção. */
export class SoundQueue {
    readonly slots: SoundEvent[];
    count = 0;
    dropped = 0;
    constructor(capacity = 256) {
        this.slots = Array.from({ length: capacity }, () => ({ type: 'shot', kind: 'patrol', x: 0, z: 0 }));
    }
    emit(type: SoundEventType, x: number, z: number, kind: RobotKind = 'patrol') {
        if (this.count === this.slots.length) { this.dropped++; return; }
        const e = this.slots[this.count++]; e.type = type; e.kind = kind; e.x = x; e.z = z;
    }
    clear() { this.count = 0; }
}
export const playerSounds = new SoundQueue(32);
/** Dois apoios por ciclo; lê o relógio do mesmo clipe que desenha os pés. */
export class FootstepClock {
    private previous = -1;
    private clip = '';
    reset() { this.previous = -1; this.clip = ''; }
    advance(clip: string, time: number, duration: number) {
        if (!duration) return false;
        const phase = Math.floor(time / duration * 2);
        if (this.clip !== clip || this.previous < 0) { this.clip = clip; this.previous = phase; return false; }
        const step = phase !== this.previous;
        this.previous = phase;
        return step;
    }
}
