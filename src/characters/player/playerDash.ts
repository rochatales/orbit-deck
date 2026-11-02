import { PLAYER_MOVEMENT } from './playerConfig';

/** Dash liberado pelo autor só no combate de Shanghai. */
export function dashEnabled(map: string): boolean { return map === 'shanghai'; }

type Mutable<T> = { current: T };
/** Janela em tempo de simulação. Segurar Espaço não rearma o dash após o cooldown. */
export function advanceDash(now: number, pressed: boolean, blocked: boolean,
  until: Mutable<number>, cooldownUntil: Mutable<number>, held: Mutable<boolean>): boolean {
  if (blocked) { until.current = 0; held.current = false; return false; }
  if (pressed && !held.current && now >= cooldownUntil.current) {
    until.current = now + PLAYER_MOVEMENT.dashDuration;
    cooldownUntil.current = now + PLAYER_MOVEMENT.dashCooldown;
  }
  held.current = pressed;
  return now < until.current;
}
