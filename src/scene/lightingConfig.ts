/** Valores de direção, cor e exposição local para ajuste visual pelo autor.
 * normalBias de 3 cm reduz auto-sombra granulada no traje/arma sob luz rasante. */
export const MARS_SUNRISE = {
    sunPosition: [120, 18, 90] as [number, number, number], sunColor: '#ffd0a0', sunIntensity: 1.85,
    skyColor: '#efd3b3', groundColor: '#6a4537', hemisphereIntensity: .35, shadowReach: 80, shadowNormalBias: .03
} as const;
export const SHANGHAI_DAWN = {
    zenith: '#101923', horizon: '#75616b', lower: '#1b2630', sunPosition: [-110, 6, -90] as [number,number,number],
    skyColor: '#8297b6', groundColor: '#292c32', hemisphereIntensity: .32, sunColor: '#a894a7', sunIntensity: .12,
    fogNear: 70, fogFar: 175, shadowNormalBias: .03
} as const;
export const VISOR_LIGHT = {
    // Compensa Head no Idle medido no GLB (pescoço a 1,041627 m), mais offset visual 0,02 m.
    headOffset: { side:.0107749622, forward:.1904827685, height:.2583726651 },
    muzzleLift: .18,
    height: 1.32, forward: .26, reach: 26, aimDistance: 12, aimHeight: .15,
    color: '#cce8ff', intensity: 80, angle: Math.PI / 5, penumbra: .65, shadowMap: 1024, shadowNormalBias: .03
} as const;

/** Halo local da mochila: mesma cor das turbinas ARES, sem mapa de sombras extra. */
export const BACKPACK_LIGHT = {
    color: '#00f5ff', intensity: 1.5, reach: 3.5, decay: 2,
    stripeEmission: .8,
    // Origem acima e atrás do casco da mochila; coordenadas do acessório antes do encaixe.
    position: [0, .15, -.28] as [number, number, number]
} as const;

/** Visor da colônia: foco azul amplo e suave, independente do farol de Shanghai. */
export const COLONY_VISOR_LIGHT = {
    color: '#83dfff', intensity: 3, reach: 4, decay: 2,
    angle: Math.PI / 3.5, penumbra: 1,
    // Espaço local do Head, medido no Idle_Colony do astronauta (cabeça a 1,096 m).
    position: [.02195134, .07430776, .18511355] as [number, number, number],
    target: [.19069824, -.20240352, 1.85690782] as [number, number, number],
    stripeColor: '#4bd4ff', stripeRadius: .0038, haloRadius: .008, haloOpacity: .14
} as const;
