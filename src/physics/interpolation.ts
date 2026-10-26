/** S2.11: opção de comparação, padrão aprovado continua sem interpolação. */
export const PHYSICS_STEP = 1 / 60;
export function isInterpolationEnabled(search: string) {
    return new URLSearchParams(search).get('interp') === '1';
}
export const INTERPOLATE = typeof window !== 'undefined' && isInterpolationEnabled(window.location.search);
// Ordem só no experimento: Rapier interpola o grupo antes da leitura visual/câmera.
export const PHYSICS_PRIORITY = INTERPOLATE ? -100 : 0;
export const PLAYER_POSE_PRIORITY = INTERPOLATE ? -90 : 0;
export const CAMERA_PRIORITY = INTERPOLATE ? -80 : 0;
