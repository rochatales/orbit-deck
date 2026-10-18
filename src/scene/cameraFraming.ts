import type { RectBounds } from '../utils/math';
/** Área de referência visual desacoplada dos limites físicos da fase. */
export const SHANGHAI_FRAMING = { width: 34, depth: 36 };
export function cameraFit(width: number, height: number, bounds: RectBounds, framing?: { width: number; depth: number }) {
    const w = framing?.width ?? bounds.maxX - bounds.minX;
    const d = framing?.depth ?? bounds.maxZ - bounds.minZ;
    return Math.min(width / Math.max(35, w * .8), height / Math.max(26, d * .65));
}
