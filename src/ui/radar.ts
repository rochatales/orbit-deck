/** Radar do HUD: alcance, cores e projeção mundo → disco, alinhada à câmera ortográfica. */
export const RADAR = {
  rangeM: 34, /** Unidades de desenho, não pixels de tela. */ sizePx: 132, profilePx: 30, pulseSeconds: 2.4, sweepSeconds: 3.6, fps: 30,
  colors: { grid: '#83e5d7', aircraft: '#66f0ff', enemy: '#ff4b4b', life: '#ff8fc0', loot: '#ffd65a' }
} as const;
export type RadarKind = 'aircraft' | 'enemy' | 'life' | 'loot';
export interface RadarBlip { x: number; z: number; kind: RadarKind }

/**
 * A câmera fica em (cos a, sin a) do jogador e olha para ele: o topo da tela aponta para
 * (-cos a, -sin a) no chão e a direita da tela para (sin a, -cos a). Devolve coordenadas em
 * [-1, 1] (y para cima) e se o ponto ficou preso na borda (fora do alcance).
 */
export function radarProject(dx: number, dz: number, angle: number, range = RADAR.rangeM) {
  const c = Math.cos(angle), s = Math.sin(angle);
  let right = (dx * s - dz * c) / range, up = (-dx * c - dz * s) / range;
  const r = Math.hypot(right, up), clamped = r > 1;
  if (clamped) { right /= r; up /= r; }
  return { x: right, y: up, clamped };
}

/** Lista o que o radar mostra, sem alocar novos objetos além do array reaproveitado. */
export function collectBlips(out: RadarBlip[], sim: {
  robots: readonly { x: number; z: number; hp: number }[];
  hearts: readonly { x: number; z: number; active: boolean }[];
  drops: readonly { x: number; z: number; active: boolean; spawned: boolean }[];
  crates: readonly { x: number; z: number; phase: string }[];
} | null, aircraft: { x: number; z: number }) {
  let n = 0;
  const push = (x: number, z: number, kind: RadarKind) => {
    const blip = out[n] ?? (out[n] = { x: 0, z: 0, kind });
    blip.x = x; blip.z = z; blip.kind = kind; n++;
  };
  if (sim) {
    for (const robot of sim.robots) if (robot.hp > 0) push(robot.x, robot.z, 'enemy');
    for (const kit of sim.hearts) if (kit.active) push(kit.x, kit.z, 'life');
    for (const drop of sim.drops) if (drop.active && drop.spawned) push(drop.x, drop.z, 'loot');
    for (const crate of sim.crates) if (crate.phase === 'closed') push(crate.x, crate.z, 'loot');
  }
  push(aircraft.x, aircraft.z, 'aircraft');
  out.length = n;
  return out;
}
