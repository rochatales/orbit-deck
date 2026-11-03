import { consumeDashEnergy, type BackpackEnergy } from '../../game/backpackConfig';
import { PLAYER_MOVEMENT } from './playerConfig';

/** Dash liberado pelo autor na colônia e em Shanghai; demais bloqueios seguem no controller. */
export function dashEnabled(map: string): boolean { return map === 'mars' || map === 'shanghai'; }

type Mutable<T> = { current: T };
/** Janela em tempo de simulação. Segurar Espaço não rearma o dash após o cooldown. */
export function advanceDash(now: number, pressed: boolean, blocked: boolean,
  until: Mutable<number>, cooldownUntil: Mutable<number>, held: Mutable<boolean>, energy?: BackpackEnergy): boolean {
  if (blocked) { until.current = 0; held.current = false; return false; }
  if (pressed && !held.current && now >= cooldownUntil.current && (!energy || consumeDashEnergy(energy))) {
    until.current = now + PLAYER_MOVEMENT.dashDuration;
    cooldownUntil.current = now + PLAYER_MOVEMENT.dashCooldown;
  }
  held.current = pressed;
  return now < until.current;
}
