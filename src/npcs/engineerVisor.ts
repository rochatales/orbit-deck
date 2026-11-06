/** Faixa inferior frontal medida novamente por raios no GLB posado em Idle.
 * Y constante no Head; Z acompanha a superfície, com largura mundial de ~34 cm.
 * Distância do centro à malha ~15,7 mm; toda a curva/halo mantém folga positiva.
 * Espessura, materiais e montagem preservados. Medidas em faixa-reta-medidas.json. */
export const ENGINEER_VISOR_POINTS = [
    [-0.109, 0.06, 0.12644629],
    [-0.095375, 0.06, 0.13589441],
    [-0.08175, 0.06, 0.1463814],
    [-0.068125, 0.06, 0.15396917],
    [-0.0545, 0.06, 0.1617782],
    [-0.040875, 0.06, 0.16763304],
    [-0.02725, 0.06, 0.17013865],
    [-0.013625, 0.06, 0.17240857],
    [0, 0.06, 0.17431555],
    [0.013625, 0.06, 0.17300368],
    [0.02725, 0.06, 0.17114615],
    [0.040875, 0.06, 0.16928397],
    [0.0545, 0.06, 0.16187896],
    [0.068125, 0.06, 0.15370035],
    [0.08175, 0.06, 0.14552174],
    [0.095375, 0.06, 0.13584535],
    [0.109, 0.06, 0.12731093]
] as const;
export const ENGINEER_VISOR_RADIUS_SCALE = 1.6416853033287477 / 1.5570486838860242;
