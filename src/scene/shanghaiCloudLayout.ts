/** Distribuição da névoa baixa de Shanghai: anel denso fora da borda, bancos que atravessam o
 * mapa com o vento (passam pelo explorador de tempos em tempos) e um véu no centro. */
export const CLOUD_CLEAR = { inner: 6, outer: 14 } as const;
export const CLOUD_WIND = { x: 1, z: .12 } as const;
export interface Cloud { x: number; y: number; z: number; scale: number; stretch: number; spin: number; alpha: number; drift: number; minX: number; maxX: number; minZ: number; maxZ: number; bank?: boolean }

export function cloudLayout(still = false): Cloud[] {
  const list: Cloud[] = [];
  // Anel externo: 64 puffs girados, alternando dois níveis.
  for (let i = 0; i < 64; i++) {
    const side = i % 4, t = (Math.floor(i / 4) / 15) * 2 - 1;
    const jitter = ((i * 17) % 13) - 6;
    const x = side === 0 || side === 1 ? t * 64 : (side === 2 ? -60 : 60) + jitter;
    const z = side === 0 ? -62 + jitter : side === 1 ? 62 + jitter : t * 66;
    list.push({ x, z, y: 2.6 + ((i * 7) % 10) * .2, scale: 16 + ((i * 11) % 13), stretch: .7 + ((i * 5) % 7) * .08,
      spin: i * 2.399, alpha: .38 + ((i * 3) % 5) * .03, drift: still ? 0 : .3 + ((i * 5) % 8) * .05,
      minX: -78, maxX: 78, minZ: -80, maxZ: 80 });
  }
  // Bancos: 12 faixas de vento (a cada 9 m em z), cada uma com um grupo de 3 puffs em fase
  // espalhada (razão áurea) a ~1 m/s: algum banco passa por qualquer ponto a cada ~30–60 s.
  for (let b = 0; b < 12; b++) {
    const cx = -80 + ((b * .618034) % 1) * 160, cz = -54 + (b + .5) * 9, speed = .9 + (b % 3) * .1;
    for (let k = 0; k < 3; k++) list.push({
      x: cx + (k - 1) * 7, z: cz + ((k * 11 + b * 5) % 7) - 3, y: 3 + k * .3,
      scale: 15 + ((b * 7 + k * 5) % 10), stretch: .6 + ((b + k) % 4) * .1, spin: b * 1.3 + k * 2.1,
      alpha: .22 + ((b + k * 2) % 4) * .03, drift: still ? 0 : speed, minX: -80, maxX: 80, minZ: -64, maxZ: 64, bank: true
    });
  }
  // Interior: véu fixo mais leve entre os bancos.
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2, r = 12 + ((i * 17) % 24);
    list.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, y: 3.4 + ((i * 13) % 8) * .15, scale: 14 + ((i * 7) % 10),
      stretch: .75 + ((i * 3) % 5) * .08, spin: i * 1.7, alpha: .13, drift: still ? 0 : .25 + ((i * 3) % 6) * .04,
      minX: -55, maxX: 55, minZ: -58, maxZ: 58 });
  }
  return list;
}
