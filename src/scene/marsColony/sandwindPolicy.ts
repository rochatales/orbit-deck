/** S6.19c / S7.8 — política da prévia; distâncias no plano XZ, não da câmera. */
export const SANDWIND_PROFILES = {
    compact: { label: 'Compacto', clear: 12, opaque: 28, hide: 34, reveal: 30 },
    balanced: { label: 'Equilibrado', clear: 22, opaque: 42, hide: 48, reveal: 44 },
    extended: { label: 'Amplo', clear: 36, opaque: 62, hide: 68, reveal: 64 }
} as const;
export type SandwindProfile = keyof typeof SANDWIND_PROFILES;
export interface GroundBounds { minX: number; maxX: number; minZ: number; maxZ: number }

export function sandwindPreviewEnabled(search: string) {
    return new URLSearchParams(search).has('sandwindPreview');
}

/** Distância à borda mais próxima: prédios grandes não somem pelo seu centro. */
export function distanceToBoundsSquared(x: number, z: number, bounds: GroundBounds) {
    const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX);
    const dz = Math.max(bounds.minZ - z, 0, z - bounds.maxZ);
    return dx * dx + dz * dz;
}

/** Ambas as fronteiras ficam além da areia opaca. */
export function shouldHideInSandwind(wasHidden: boolean, distanceSquared: number, profile: SandwindProfile) {
    const p = SANDWIND_PROFILES[profile];
    const threshold = wasHidden ? p.reveal : p.hide;
    return distanceSquared > threshold * threshold;
}
