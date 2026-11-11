import { create } from 'zustand';
import { ACTIVATION_DURATION, COLONY_POWER, POWER_RAMP, type ActivationKind, type PoweredBuilding } from './colonyPowerConfig';

export const useActivationSequence = create<{ kind: ActivationKind | null }>(() => ({ kind: null }));
export const activationClock = { elapsed: 0 };

export function beginActivation(kind: ActivationKind, reducedMotion: boolean) {
    if (reducedMotion || useActivationSequence.getState().kind) return false;
    activationClock.elapsed = 0;
    useActivationSequence.setState({ kind });
    return true;
}
export function finishActivation() {
    if (!useActivationSequence.getState().kind) return false;
    useActivationSequence.setState({ kind: null });
    return true;
}
export function advanceActivation(delta: number) {
    const { kind } = useActivationSequence.getState();
    if (!kind) return false;
    activationClock.elapsed += delta;
    return activationClock.elapsed >= ACTIVATION_DURATION[kind] && finishActivation();
}

export function buildingPower(id: PoweredBuilding, campaign: boolean, powered: boolean) {
    const config = COLONY_POWER[id], initial = config.initial;
    if (!campaign) return 1;
    if (!powered) return initial;
    if (useActivationSequence.getState().kind !== config.flag) return 1;
    const t = Math.min(1, Math.max(0, (activationClock.elapsed - config.delay) / POWER_RAMP));
    const ramp = t * t * (3 - 2 * t);
    const flicker = t < .28 ? .12 * Math.sin(t * 65) ** 2 * (1 - t / .28) : 0;
    return initial + (1 - initial) * (ramp + flicker);
}
