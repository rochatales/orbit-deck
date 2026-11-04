import { clearSegment, type Position, type Terrain } from './navigation';
/** Primeiro playtest: somente golpe; bloquear fica fora por decisão do autor. */
export const MACHETE = {
  damage: 50, range: 2.6, arc: Math.PI * 2 / 3, interval: .65, impactDelay: .325,
  runReferenceSpeed: 2.9589122906327248, backwardReferenceSpeed: 2.4191343784332275,
  /** Depois do corte, tempo para o próximo golpe ainda continuar o combo. */
  chainWindow: .3,
  /** O avanço do clipe para antes de atravessar quem já está ao alcance do corte. */
  lungeStopDistance: 1.7
} as const;
/**
 * Combo de três cortes do clipe do autor: rápido, mais rápido e pesado. A média segue em 0,65 s
 * por golpe, então o dano por segundo não muda. O dano cai no pico da lâmina de cada corte.
 */
export const MACHETE_COMBO = [
  { interval: MACHETE.interval, impact: MACHETE.impactDelay },
  { interval: .5, impact: .16 },
  { interval: .8, impact: .24 }
] as const;
/** Com a espada, a queda aparece antes do painel de explorador abatido. */
export const MACHETE_DEATH_OVERLAY_MS = 2000;
export type PlayerWeapon = 'rifle' | 'machete';
/** Alcance até a superfície circular do alvo; paredes continuam sólidas. */
export function meleeCanHit(player: Position, angle: number, target: Position, radius: number, terrain: Terrain) {
  const dx = target.x - player.x, dz = target.z - player.z, distance = Math.hypot(dx, dz);
  if (distance > MACHETE.range + radius || !clearSegment(player, target, terrain, 0)) return false;
  if (distance <= radius) return true;
  return (dx * Math.sin(angle) + dz * Math.cos(angle)) / distance >= Math.cos(MACHETE.arc / 2);
}
/** Há alvo vivo à frente, perto o bastante para o passo do golpe parar nele? */
export function meleeLungeBlocked(player: Position, angle: number, robots: readonly (Position & { hp: number; radius?: number })[]) {
  const sin = Math.sin(angle), cos = Math.cos(angle);
  for (const robot of robots) {
    if (robot.hp <= 0) continue;
    const dx = robot.x - player.x, dz = robot.z - player.z, reach = MACHETE.lungeStopDistance + (robot.radius ?? .5);
    if (dx * dx + dz * dz <= reach * reach && dx * sin + dz * cos > 0) return true;
  }
  return false;
}
