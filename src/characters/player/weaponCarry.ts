import type { PlayerWeapon } from '../../combat/melee';

/** Na colônia, só a arma principal fica pendurada; em combate, o rifle reserva mantém o coldre. */
export function weaponCarryMode(weapon: PlayerWeapon, selected: PlayerWeapon, combat: boolean): 'hand' | 'holster' | 'hidden' {
  if (weapon === selected) return combat ? 'hand' : 'holster';
  return combat && weapon === 'rifle' ? 'holster' : 'hidden';
}
