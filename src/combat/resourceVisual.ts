/** Apenas apresentação: não muda coleta, contador, colisão ou save. */
export type ResourceKind = 'titanium' | 'copper' | 'iron';
export const RESOURCE_KINDS: readonly ResourceKind[] = ['titanium', 'copper', 'iron'];
export const RESOURCE_VISUAL = {
    height: .35, floatAmplitude: .06, floatPeriod: 1.6,
    ringY: .018, ringRadius: .6, ringAmplitude: .12, ringPeriod: 1.2,
    colors: { titanium: '#ffd35a', copper: '#ff8b32', iron: '#dce5ed' },
    // Primeira metade do TEMPO VISUAL a 1×; rampa quadrática nos próximos 30%; final a 3×.
    collect: { normalFraction: .5, rampFraction: .3, endSpeed: 3 },
} as const;
export function resourcePhase(index: number, kind: ResourceKind) {
    return index * 2.399963229728653 + RESOURCE_KINDS.indexOf(kind) * 1.7;
}
export function resourceHeight(time: number, phase: number) {
    return RESOURCE_VISUAL.height + RESOURCE_VISUAL.floatAmplitude * Math.sin(time * Math.PI * 2 / RESOURCE_VISUAL.floatPeriod + phase);
}
export function resourceRingRadius(time: number, phase: number) {
    return RESOURCE_VISUAL.ringRadius * (1 + RESOURCE_VISUAL.ringAmplitude * Math.sin(time * Math.PI * 2 / RESOURCE_VISUAL.ringPeriod + phase));
}
function integratedCollectRate(u: number) {
    const { normalFraction: normal, rampFraction: ramp, endSpeed } = RESOURCE_VISUAL.collect;
    if (u <= normal) return u;
    const v = Math.min(u - normal, ramp);
    return normal + v + (endSpeed - 1) * v * v * v / (3 * ramp * ramp)
        + Math.max(0, u - normal - ramp) * endSpeed;
}
export function collectDuration(clipDuration: number) { return clipDuration / integratedCollectRate(1); }
export function collectClipTime(age: number, clipDuration: number) {
    const duration = collectDuration(clipDuration);
    return Math.min(clipDuration, duration * integratedCollectRate(Math.min(1, Math.max(0, age / duration))));
}
