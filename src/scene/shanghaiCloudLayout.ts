/** Distribuição da névoa baixa de Shanghai: anel denso fora da borda, véu tênue no centro. */
export const CLOUD_CLEAR = { inner: 11, outer: 22 } as const;
export interface Cloud { x: number; y: number; z: number; scale: number; stretch: number; spin: number; alpha: number; drift: number; minX: number; maxX: number; minZ: number; maxZ: number }

export function cloudLayout(still = false): Cloud[] {
  const list: Cloud[] = [];
  // Anel externo: 64 puffs menores e sobrepostos (antes 48 discos grandes), alternando dois níveis.
  for (let i = 0; i < 64; i++) {
    const side = i % 4, t = (Math.floor(i / 4) / 15) * 2 - 1;
    const jitter = ((i * 17) % 13) - 6;
    const x = side === 0 || side === 1 ? t * 64 : (side === 2 ? -60 : 60) + jitter;
    const z = side === 0 ? -62 + jitter : side === 1 ? 62 + jitter : t * 66;
    list.push({ x, z, y: 2.6 + ((i * 7) % 10) * .2, scale: 16 + ((i * 11) % 13), stretch: .7 + ((i * 5) % 7) * .08,
      spin: i * 2.399, alpha: .3 + ((i * 3) % 5) * .03, drift: still ? 0 : .3 + ((i * 5) % 8) * .05,
      minX: -78, maxX: 78, minZ: -80, maxZ: 80 });
  }
  // Interior: véu bem tênue que só aparece longe do explorador.
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2, r = 12 + ((i * 17) % 24);
    list.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, y: 3.4 + ((i * 13) % 8) * .15, scale: 14 + ((i * 7) % 10),
      stretch: .75 + ((i * 3) % 5) * .08, spin: i * 1.7, alpha: .09, drift: still ? 0 : .25 + ((i * 3) % 6) * .04,
      minX: -55, maxX: 55, minZ: -58, maxZ: 58 });
  }
  return list;
}
