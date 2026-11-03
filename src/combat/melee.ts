import { clearSegment, type Position, type Terrain } from './navigation';
/** Primeiro playtest: somente golpe; bloquear fica fora por decisão do autor. */
export const MACHETE = {
  damage: 50, range: 2, arc: Math.PI * 2 / 3, interval: .65, impactDelay: .325,
  runReferenceSpeed: 2.9589122906327248, backwardReferenceSpeed: 2.4191343784332275
} as const;
export type PlayerWeapon = 'rifle' | 'machete';
/** Alcance até a superfície circular do alvo; paredes continuam sólidas. */
export function meleeCanHit(player: Position, angle: number, target: Position, radius: number, terrain: Terrain) {
  const dx = target.x - player.x, dz = target.z - player.z, distance = Math.hypot(dx, dz);
  if (distance > MACHETE.range + radius || !clearSegment(player, target, terrain, 0)) return false;
  if (distance <= radius) return true;
  return (dx * Math.sin(angle) + dz * Math.cos(angle)) / distance >= Math.cos(MACHETE.arc / 2);
}
