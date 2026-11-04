/**
 * Física a 60 Hz em tela de 144 Hz: sem interpolação, o corpo fica parado em 63 de 110 quadros e
 * depois salta (medido em 04/11/2026). Todas as prévias aprovadas desde 02/11 já usavam `interp=1`,
 * então virou o padrão, revendo a decisão da S2.11. `?interp=0` desliga para comparar.
 */
export const PHYSICS_STEP = 1 / 60;
export function isInterpolationEnabled(search: string) {
    return new URLSearchParams(search).get('interp') !== '0';
}
export const INTERPOLATE = typeof window !== 'undefined' && isInterpolationEnabled(window.location.search);
// Ordem da interpolação: Rapier interpola o grupo antes da leitura visual/câmera.
export const PHYSICS_PRIORITY = INTERPOLATE ? -100 : 0;
export const PLAYER_POSE_PRIORITY = INTERPOLATE ? -90 : 0;
export const CAMERA_PRIORITY = INTERPOLATE ? -80 : 0;
