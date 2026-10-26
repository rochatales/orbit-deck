import { INTERPOLATE, PHYSICS_STEP } from './interpolation';
import { playerPosition, playerVisualPosition } from '../state/playerTransient';
type Position = { x: number; y: number; z: number };
const enabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');
const target = { x: 0, y: .55, z: 0 }, source = { x: 0, y: 0, z: 0 };
let frames = 0, steps = 0, minStep = Infinity, maxStep = 0, maxOffset = 0, maxHorizontal = 0, angle = 0, zoom = 1;
export function resetInterpolationTelemetry() {
    frames = 0; steps = 0; minStep = Infinity; maxStep = 0; maxOffset = 0; maxHorizontal = 0;
}
export function recordPhysicsStep(dt: number) {
    if (!enabled) return;
    steps++; minStep = Math.min(minStep, dt); maxStep = Math.max(maxStep, dt);
}
export function recordCameraFollow(follow: Position, at: Position, rotation: number, scale: number) {
    if (!enabled) return;
    source.x = follow.x; source.y = follow.y; source.z = follow.z;
    target.x = at.x; target.y = at.y; target.z = at.z; angle = rotation; zoom = scale;
    const p = playerPosition, v = playerVisualPosition;
    maxOffset = Math.max(maxOffset, Math.hypot(p.x - v.x, p.y - v.y, p.z - v.z));
    maxHorizontal = Math.max(maxHorizontal, Math.hypot(p.x - v.x, p.z - v.z)); frames++;
}
/** Só chamada pela instrumentação ?perf, nunca pelo laço de simulação. */
export function interpolationSnapshot() {
    return { enabled: INTERPOLATE, timeStep: PHYSICS_STEP, frames, steps,
        minStep: steps ? minStep : null, maxStep: steps ? maxStep : null, maxOffset, maxHorizontal,
        physical: { ...playerPosition }, visual: { ...playerVisualPosition },
        cameraSource: { ...source }, cameraTarget: { ...target }, cameraAngle: angle, cameraZoom: zoom };
}
