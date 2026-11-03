import layout from '../../assets/shanghai-fase01/layout.json';
import { SHANGHAI_SUPPLY_CRATES } from '../props/supplyCrate';
import { CRATE_IMPACT, crateRandom } from '../props/crateImpact';

/** Destruição urbana de Shanghai (S6.3): só visual, sem colisor e sem asset novo.
 * Rua e calçada vêm da grade de superfícies (0 m / 0,12 m); prédios, canteiros e as
 * crateras dos baús ficam de fora. Tudo determinístico para a mesma cidade em toda sessão. */
type Height = (x: number, z: number) => number;
export type Ground = 'rua' | 'calcada';
export const DECAY = {
  streetDecals: 380, sidewalkDecals: 560, debrisClusters: 95, weedTries: 12000, weedMax: 1100,
  border: 1.2, streetLift: .03, sidewalkLift: .012, sidewalkTop: .12
} as const;
/** Atlas 4×4: 0–7 rua, 8–15 calçada. */
export const DECAL = {
  rua: [{ cell: 0, size: [2.4, 4.6] }, { cell: 1, size: [2.4, 4.6] }, { cell: 2, size: [1.6, 3] }, { cell: 3, size: [3, 5.5] },
    { cell: 4, size: [.9, 1.8] }, { cell: 5, size: [1.1, 2.2] }, { cell: 6, size: [1.6, 3.2] }, { cell: 7, size: [1.2, 2.4] }],
  calcada: [{ cell: 8, size: [1.2, 2.6] }, { cell: 9, size: [1.2, 2.6] }, { cell: 10, size: [1, 1.8] }, { cell: 11, size: [1, 1.8] },
    { cell: 12, size: [1.2, 2.8] }, { cell: 13, size: [1.2, 2.8] }, { cell: 14, size: [1, 2.2] }, { cell: 15, size: [.8, 1.8] }]
} as const;
export const POTHOLES = new Set([4, 5]);
export const MISSING_TILES = new Set([10, 11]);

export interface Decal { x: number; y: number; z: number; size: number; angle: number; cell: number; ground: Ground }
export interface Debris { x: number; y: number; z: number; yaw: number; tilt: number; roll: number; w: number; h: number; d: number; tone: 'asfalto' | 'concreto' | 'tijolo' | 'ladrilho' }
export interface Weed { x: number; y: number; z: number; height: number; width: number; yaw: number; tone: number }

const { minX, maxX, minZ, maxZ } = layout.bounds;
const footprints = layout.buildings.map(b => ({ minX: b.x - b.w / 2 - .15, maxX: b.x + b.w / 2 + .15, minZ: b.z - b.d / 2 - .15, maxZ: b.z + b.d / 2 + .15 }));
const inBuilding = (x: number, z: number) => footprints.some(f => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ);
const nearBuilding = (x: number, z: number, m: number) => footprints.some(f => x > f.minX - m && x < f.maxX + m && z > f.minZ - m && z < f.maxZ + m) && !inBuilding(x, z);
const inCrater = (x: number, z: number, pad = 0) => SHANGHAI_SUPPLY_CRATES.some(c => Math.hypot(x - c.x, z - c.z) < CRATE_IMPACT.scarRadius * .8 + pad);
const landing = layout.landingReservation;
const onLanding = (x: number, z: number) => x > landing.minX && x < landing.maxX && z > landing.minZ && z < landing.maxZ;

/** Rua, calçada ou nada (prédio, canteiro, grama, fora da borda). */
export function groundAt(x: number, z: number, height: Height): Ground | null {
  if (x < minX + DECAY.border || x > maxX - DECAY.border || z < minZ + DECAY.border || z > maxZ - DECAY.border || inBuilding(x, z)) return null;
  const y = height(x, z);
  if (y < .05) return 'rua';
  return Math.abs(y - DECAY.sidewalkTop) < .01 ? 'calcada' : null;
}
const sameGround = (x: number, z: number, r: number, ground: Ground, height: Height) =>
  [[r, r], [-r, r], [r, -r], [-r, -r], [r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => groundAt(x + dx, z + dz, height) === ground);
/** Perto da troca rua↔calçada: sarjeta, meio-fio e canteiros. */
const nearCurb = (x: number, z: number, ground: Ground, height: Height, r = .45) =>
  [[r, 0], [-r, 0], [0, r], [0, -r]].some(([dx, dz]) => { const g = groundAt(x + dx, z + dz, height); return g !== null && g !== ground; });

/** Envelhecimento 0–1 em manchas de ~12 m: onde a calçada está largada, mais mato e lodo. */
export function ageAt(x: number, z: number) {
  const cell = 12, ix = Math.floor(x / cell), iz = Math.floor(z / cell), tx = x / cell - ix, tz = z / cell - iz;
  const h = (a: number, b: number) => crateRandom(`idade:${a}:${b}`)();
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const top = h(ix, iz) + (h(ix + 1, iz) - h(ix, iz)) * sx, bottom = h(ix, iz + 1) + (h(ix + 1, iz + 1) - h(ix, iz + 1)) * sx;
  return top + (bottom - top) * sz;
}

export function createDecals(height: Height): Decal[] {
  const rand = crateRandom('shanghai-decalques'), out: Decal[] = [];
  for (const ground of ['rua', 'calcada'] as const) {
    const want = ground === 'rua' ? DECAY.streetDecals : DECAY.sidewalkDecals;
    for (let tries = 0, placed = 0; placed < want && tries < want * 40; tries++) {
      const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ);
      if (groundAt(x, z, height) !== ground || inCrater(x, z)) continue;
      const kind = DECAL[ground][Math.floor(rand() * 8)];
      // Calçada envelhecida concentra ladrilhos faltando e lodo.
      if (ground === 'calcada' && (MISSING_TILES.has(kind.cell) || kind.cell >= 12) && rand() > .45 + ageAt(x, z) * .8) continue;
      const size = kind.size[0] + rand() * (kind.size[1] - kind.size[0]);
      // O quadrado inteiro precisa caber no mesmo piso: nada de decalque dobrando no meio-fio.
      if (!sameGround(x, z, size * .5, ground, height)) continue;
      const tiled = ground === 'calcada' && kind.cell <= 11;
      out.push({ x, z, size, cell: kind.cell, ground, y: height(x, z) + (ground === 'rua' ? DECAY.streetLift : DECAY.sidewalkLift),
        angle: tiled ? Math.floor(rand() * 4) * Math.PI / 2 : rand() * Math.PI * 2 });
      placed++;
    }
  }
  return out;
}

const TONES: Record<Ground, Debris['tone'][]> = { rua: ['asfalto', 'asfalto', 'concreto', 'tijolo'], calcada: ['ladrilho', 'ladrilho', 'concreto', 'tijolo'] };
export function createDebris(height: Height, decals: readonly Decal[]): Debris[] {
  const rand = crateRandom('shanghai-destrocos'), out: Debris[] = [];
  const piece = (x: number, z: number, ground: Ground, scale: number, tone?: Debris['tone']) => {
    const h = (.03 + rand() * .07) * scale;
    out.push({ x, z, y: height(x, z) + h * .25, yaw: rand() * Math.PI * 2, tilt: rand() * .5, roll: (rand() - .5) * .5,
      w: (.12 + rand() * .3) * scale, h, d: (.1 + rand() * .22) * scale, tone: tone ?? TONES[ground][Math.floor(rand() * 4)] });
  };
  // Montes perto de fachadas e meio-fios, onde o entulho para.
  for (let tries = 0, clusters = 0; clusters < DECAY.debrisClusters && tries < 20000; tries++) {
    const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ), ground = groundAt(x, z, height);
    if (!ground || onLanding(x, z) || inCrater(x, z, 1)) continue;
    const bias = nearBuilding(x, z, 1.4) ? .9 : nearCurb(x, z, ground, height, .8) ? .7 : .12;
    if (rand() > bias) continue;
    const count = 3 + Math.floor(rand() * 7), big = rand() < .25 ? 1.8 : 1;
    for (let k = 0; k < count; k++) {
      const px = x + (rand() - .5) * 1.6, pz = z + (rand() - .5) * 1.6, g = groundAt(px, pz, height);
      if (g && !inCrater(px, pz)) piece(px, pz, g, k === 0 ? big : 1);
    }
    clusters++;
  }
  // Buraco na rua cospe pedaços de asfalto em volta.
  for (const d of decals) if (POTHOLES.has(d.cell)) for (let k = 0; k < 5; k++) {
    const a = rand() * Math.PI * 2, r = d.size * (.35 + rand() * .35), x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
    if (groundAt(x, z, height) === 'rua') piece(x, z, 'rua', .8, 'asfalto');
  }
  // Ladrilho faltando: as peças soltas ficam ao lado.
  for (const d of decals) if (MISSING_TILES.has(d.cell)) for (let k = 0; k < 3; k++) {
    const x = d.x + (rand() - .5) * d.size, z = d.z + (rand() - .5) * d.size;
    if (groundAt(x, z, height) === 'calcada') piece(x, z, 'calcada', 1.2, 'ladrilho');
  }
  return out;
}

/** Mato: calçada velha, junta com o meio-fio, pé das fachadas, ladrilho faltando e sarjeta. */
export function createWeeds(height: Height, decals: readonly Decal[]): Weed[] {
  const rand = crateRandom('shanghai-mato'), out: Weed[] = [];
  const tuft = (x: number, z: number, scale: number) => {
    if (out.length >= DECAY.weedMax || !groundAt(x, z, height) || inCrater(x, z)) return;
    out.push({ x, z, y: height(x, z) - .01, height: (.28 + rand() * .42) * scale, width: (.38 + rand() * .4) * scale, yaw: rand() * Math.PI, tone: rand() });
  };
  for (const d of decals) if (MISSING_TILES.has(d.cell)) for (let k = 0, n = 2 + Math.floor(rand() * 3); k < n; k++)
    tuft(d.x + (rand() - .5) * d.size * .4, d.z + (rand() - .5) * d.size * .4, 1.1);
  for (let tries = 0; tries < DECAY.weedTries && out.length < DECAY.weedMax; tries++) {
    const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ), ground = groundAt(x, z, height);
    if (!ground || onLanding(x, z)) continue;
    const age = ageAt(x, z), curb = nearCurb(x, z, ground, height), wall = nearBuilding(x, z, .6);
    const chance = ground === 'calcada' ? .02 + age * age * .35 + (curb ? .3 + age * .4 : 0) + (wall ? .25 + age * .4 : 0) : (curb ? .18 + age * .3 : .004);
    if (rand() > chance) continue;
    for (let k = 0, n = 1 + Math.floor(rand() * (1 + age * 4)); k < n; k++) tuft(x + (rand() - .5) * .6, z + (rand() - .5) * .6, .7 + age * .6);
  }
  return out;
}
