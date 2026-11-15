/** Tempos e estágios da cabine: entrada (boot) e viagem (decolagem → estrelas → pouso). */
export type FlightStage = 'idle' | 'launch' | 'warp' | 'landing';
export const FLIGHT = { launchMs: 2600, warpMinMs: 2400, landingMs: 2400 } as const;
/** Entrada completa na primeira vez da sessão; curta nas seguintes. */
export const BOOT = { full: { panelMs: 1200, hologramMs: 2400 }, quick: { panelMs: 0, hologramMs: 250 } } as const;
export type BootMode = keyof typeof BOOT;

export type CockpitCue = 'engineStart' | 'panel' | 'hologram' | 'tick' | 'confirm' | 'globe' | 'denied' | 'takeoff' | 'landing' | 'engineStop';
export interface CockpitSounds { cue(name: CockpitCue): void; warp(on: boolean): void }

/**
 * Próximo estágio da viagem. `busy` é o carregamento real do destino: as estrelas
 * repetem enquanto ele durar e têm duração mínima; o pouso só começa com o mapa pronto.
 * `wait` é o tempo até reavaliar; `null` aguarda uma mudança de `busy`.
 */
export function flightStep(stage: FlightStage, busy: boolean, elapsed: number): { stage: FlightStage; wait: number | null } {
    if (stage === 'idle') return busy ? { stage: 'launch', wait: FLIGHT.launchMs } : { stage, wait: null };
    if (stage === 'launch') return elapsed >= FLIGHT.launchMs ? { stage: 'warp', wait: FLIGHT.warpMinMs } : { stage, wait: FLIGHT.launchMs - elapsed };
    if (stage === 'warp') {
        if (busy) return { stage, wait: null };
        return elapsed >= FLIGHT.warpMinMs ? { stage: 'landing', wait: FLIGHT.landingMs } : { stage, wait: FLIGHT.warpMinMs - elapsed };
    }
    return elapsed >= FLIGHT.landingMs ? { stage: 'idle', wait: null } : { stage, wait: FLIGHT.landingMs - elapsed };
}

/** Riscos de estrela fixos (ângulo em graus, atraso e duração em segundos); sem sorteio a cada render. */
export const WARP_STREAKS = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 2654435761 >>> 0) / 4294967296, b = ((i + 7) * 40503 * 65537 >>> 0) / 4294967296;
    return { angle: Math.round(a * 3600) / 10, delay: Math.round(b * 120) / 100, duration: Math.round((.55 + ((a * 7) % 1) * .65) * 100) / 100 };
});
