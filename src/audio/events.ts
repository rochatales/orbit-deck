import { DOOR_TIMING } from './doorTiming';
import type { RobotKind } from '../combat/config';
export type SoundEventType = 'shot' | 'dryFire' | 'reload' | 'playerStep' | 'enemyStep' | 'bulletHit' | 'death' | 'attack' | 'collect' | 'chargeWarning' | 'doorOpen' | 'hangarDoorOpen' | 'doorClose' | 'quartelDoorOpen' | 'quartelDoorClose' | 'hangarDoorClose';
export interface SoundEvent { type: SoundEventType; kind: RobotKind; x: number; z: number; duration?: number; emitter?: number }
/** Anel pré-alocado: nenhum objeto por evento da simulação/locomoção. */
export class SoundQueue {
    readonly slots: SoundEvent[];
    count = 0;
    dropped = 0;
    constructor(capacity = 256) {
        this.slots = Array.from({ length: capacity }, () => ({ type: 'shot', kind: 'patrol', x: 0, z: 0, duration: 0, emitter: 0 }));
    }
    emit(type: SoundEventType, x: number, z: number, kind: RobotKind = 'patrol', duration = 0, emitter = 0) {
        if (this.count === this.slots.length) { this.dropped++; return; }
        const e = this.slots[this.count++]; e.type = type; e.kind = kind; e.x = x; e.z = z; e.duration = duration; e.emitter = emitter;
    }
    clear() { this.count = 0; }
}
export const playerSounds = new SoundQueue(32);
let nextDoorId = 1;
/** Um evento por mudança de direção; tempo acompanha o curso restante e ID cancela o som anterior. */
export class DoorSoundClock {
    private target = false;
    private id = nextDoorId++;
    private profile: typeof DOOR_TIMING.normal | typeof DOOR_TIMING.quartel | typeof DOOR_TIMING.hangar;
    constructor(type: 'doorOpen' | 'quartelDoorOpen' | 'hangarDoorOpen' = 'doorOpen') {
        this.profile = type === 'hangarDoorOpen' ? DOOR_TIMING.hangar : type === 'quartelDoorOpen' ? DOOR_TIMING.quartel : DOOR_TIMING.normal;
    }
    update(open: boolean, amount: number, x: number, z: number, queue = playerSounds) {
        if (open === this.target) return;
        this.target = open;
        const remaining = open ? 1 - amount : amount;
        const full = open ? this.profile.open : this.profile.close;
        const duration = remaining <= .01 ? 0 : Math.max(DOOR_TIMING.minimum, full + Math.log(remaining) / DOOR_TIMING.response);
        queue.emit(open ? this.profile.openEvent : this.profile.closeEvent, x, z, 'patrol', duration, this.id);
    }
}
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
