/** Valores de direção, cor e exposição local para ajuste visual pelo autor. */
export const MARS_SUNRISE = {
    sunPosition: [120, 18, 90] as [number, number, number], sunColor: '#ffd0a0', sunIntensity: 1.85,
    skyColor: '#efd3b3', groundColor: '#6a4537', hemisphereIntensity: .35, shadowReach: 80
} as const;
export const SHANGHAI_DAWN = {
    zenith: '#101923', horizon: '#75616b', lower: '#1b2630', sunPosition: [-110, 6, -90] as [number,number,number],
    skyColor: '#8297b6', groundColor: '#292c32', hemisphereIntensity: .32, sunColor: '#a894a7', sunIntensity: .12,
    fogNear: 70, fogFar: 175
} as const;
export const VISOR_LIGHT = {
    // Compensa Head no Idle medido no GLB (pescoço a 1,041627 m), mais offset visual 0,02 m.
    headOffset: { side:.0107749622, forward:.1904827685, height:.2583726651 },
    height: 1.32, forward: .26, reach: 22, aimDistance: 12, aimHeight: .15,
    color: '#cce8ff', intensity: 80, angle: Math.PI / 5, penumbra: .65, shadowMap: 1024
} as const;
