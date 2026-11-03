import { BufferAttribute, BufferGeometry } from 'three';
import type { CratePlacement } from './supplyCrate';

type Height = (x: number, z: number) => number;
/** Cabines caídas do alto: base enterrada, piso afundado/rachado e placas levantadas.
 * Tudo deriva da superfície já compilada (calçada 0,12–0,15 m ou rua 0 m), sem colisor novo. */
export const CRATE_IMPACT = {
  baseHalf: .85, sink: .09, maxTilt: .035, curbTilt: .05,
  scarRadius: 3.4, scarCell: .25, scarLift: .018,
  chunks: 20, chunkHeight: .16
} as const;

/** Mesmo id → mesma cratera em todas as sessões. */
export function crateRandom(id: string) {
  let s = 2166136261;
  for (let i = 0; i < id.length; i++) s = Math.imul(s ^ id.charCodeAt(i), 16777619);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const footprint = (p: CratePlacement) => {
  const c = Math.cos(p.angle ?? 0), s = Math.sin(p.angle ?? 0), h = CRATE_IMPACT.baseHalf, out: [number, number][] = [];
  for (const u of [-h, 0, h]) for (const v of [-h, 0, h]) out.push([p.x + u * c + v * s, p.z - u * s + v * c]);
  return out;
};

/** Assentamento: abaixo do ponto mais baixo da pegada (a borda dura da base some no piso)
 * e inclinado para o lado mais baixo quando caiu sobre o meio-fio. */
export function crateSeat(p: CratePlacement, height: Height) {
  const rand = crateRandom(p.id), points = footprint(p), heights = points.map(([x, z]) => height(x, z));
  const low = Math.min(...heights), high = Math.max(...heights);
  let gx = 0, gz = 0;
  if (high - low > .05) points.forEach(([x, z], i) => { gx += (x - p.x) * (heights[i] - low); gz += (z - p.z) * (heights[i] - low); });
  const g = Math.hypot(gx, gz), curb = g > 1e-6 ? CRATE_IMPACT.curbTilt : 0;
  // Pende para longe da calçada: rotação em torno do eixo horizontal perpendicular ao degrau.
  const dx = g > 1e-6 ? -gx / g : 0, dz = g > 1e-6 ? -gz / g : 0;
  const tiltX = dz * curb + (rand() * 2 - 1) * CRATE_IMPACT.maxTilt;
  const tiltZ = -dx * curb + (rand() * 2 - 1) * CRATE_IMPACT.maxTilt;
  return { y: low - CRATE_IMPACT.sink, tiltX, tiltZ, curb: high - low > .05 };
}

/** Cicatriz de impacto: grade circular que copia a altura do piso vértice a vértice,
 * cobrindo calçada, rua e a quina do meio-fio com a mesma textura (um único desenho). */
export function impactScarGeometry(crates: readonly CratePlacement[], height: Height) {
  const { scarRadius: R, scarCell: cell, scarLift } = CRATE_IMPACT, n = Math.round(2 * R / cell);
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (const p of crates) {
    const rand = crateRandom(p.id + ':scar'), turn = rand() * Math.PI * 2, mirror = rand() < .5 ? -1 : 1;
    const scale = .92 + rand() * .16, tc = Math.cos(turn), ts = Math.sin(turn);
    const ids = new Int32Array((n + 1) * (n + 1)).fill(-1);
    const vertex = (i: number, j: number) => {
      const k = j * (n + 1) + i;
      if (ids[k] >= 0) return ids[k];
      const lx = -R + i * cell, lz = -R + j * cell, x = p.x + lx, z = p.z + lz;
      positions.push(x, height(x, z) + scarLift, z);
      const u = (lx * tc - lz * ts) * mirror / (2 * R * scale), v = (lx * ts + lz * tc) / (2 * R * scale);
      uvs.push(u + .5, v + .5);
      return (ids[k] = positions.length / 3 - 1);
    };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const cx = -R + (i + .5) * cell, cz = -R + (j + .5) * cell;
      if (Math.hypot(cx, cz) > R + cell * .5) continue;
      const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i + 1, j + 1), d = vertex(i, j + 1);
      index.push(a, d, c, a, c, b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export interface ImpactChunk { x: number; y: number; z: number; yaw: number; tilt: number; roll: number; w: number; h: number; d: number; sidewalk: boolean }
/** Placas do piso arrancadas e levantadas para fora, com a borda interna erguida pelo choque. */
export function impactChunks(p: CratePlacement, height: Height): ImpactChunk[] {
  const rand = crateRandom(p.id + ':chunks'), out: ImpactChunk[] = [], angle = p.angle ?? 0;
  for (let k = 0; k < CRATE_IMPACT.chunks; k++) {
    // 3 de cada 4 placas encostam na base (escondem a quina dura do pedestal); o resto voa longe.
    const a = (k + rand() * .8) / CRATE_IMPACT.chunks * Math.PI * 2, la = a - angle;
    const edge = CRATE_IMPACT.baseHalf / Math.max(Math.abs(Math.cos(la)), Math.abs(Math.sin(la)));
    const far = k % 4 === 3, r = edge + (far ? .9 + rand() * 1.1 : .02 + rand() * .3);
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, floor = height(x, z);
    const small = far ? .4 : 1, h = CRATE_IMPACT.chunkHeight * (.5 + rand() * .5) * small;
    out.push({
      x, z, y: floor + h * (far ? .15 : .35),
      yaw: Math.atan2(Math.cos(a), Math.sin(a)) + (rand() - .5) * .6,
      tilt: far ? .1 + rand() * .25 : .45 + rand() * .45, roll: (rand() - .5) * .35,
      w: (far ? .3 + rand() * .3 : .45 + rand() * .45) * small, h, d: (far ? .25 : .32 + rand() * .3) * small, sidewalk: floor > .06
    });
  }
  return out;
}

/** Placa irregular de 5 lados (16 triângulos), compartilhada por todas as instâncias. */
export function chunkGeometry() {
  const ring = [[-.5, -.42], [.42, -.5], [.5, .18], [.08, .5], [-.46, .3]], top: number[][] = [], bottom: number[][] = [];
  for (const [x, z] of ring) { bottom.push([x, -.5, z]); top.push([x * .86, .5, z * .86]); }
  const tri: number[] = [], push = (...v: number[][]) => v.forEach(q => tri.push(...q));
  for (let i = 1; i < 4; i++) { push(top[0], top[i + 1], top[i]); push(bottom[0], bottom[i], bottom[i + 1]); }
  for (let i = 0; i < 5; i++) { const j = (i + 1) % 5; push(bottom[i], top[i], top[j], bottom[i], top[j], bottom[j]); }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(tri), 3));
  geometry.computeVertexNormals();
  return geometry;
}
