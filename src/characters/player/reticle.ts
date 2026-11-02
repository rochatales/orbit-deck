import { meleeCanHit } from '../../combat/melee';
import { COMBAT, HIT_LAYER, RIFLE_MASK, robotConfig, writeRifleAimTarget, writeRifleMuzzle } from '../../combat/config';
import { traceShot, type Robot, type ShotTrace } from '../../combat/simulation';
import type { Position, Terrain } from '../../combat/navigation';
import type { WeaponMuzzleOffset } from '../../state/playerWeaponPose';

export const RETICLE = {
  color: '#ffffff', targetColor: '#ffc45c', normalSpread: 17, targetSpread: 10,
  transition: .12, pulsePeriod: .85, pulseAmplitude: .35
} as const;

/** Consulta visual sem efeitos: usa os mesmos volumes, alcance e proteção do cano que o tiro. */
export class ReticleAim {
  readonly marker: Position = { x: 0, z: 0 };
  private readonly muzzle: Position = { x: 0, z: 0 };
  private readonly end: Position = { x: 0, z: 0 };
  private readonly trace: ShotTrace = { to: { x: 0, z: 0 }, robot: null, blocked: false };

  target(player: Position, aim: Position, angle: number, pose: WeaponMuzzleOffset, height: number, terrain: Terrain, robots: Robot[]) {
    writeRifleMuzzle(this.muzzle, player.x, player.z, angle, pose.valid ? pose : undefined);
    // A retícula acompanha o ponteiro, inclusive sobre/atrás do jogador. Só o
    // raio de consulta usa o rumo seguro do tiro quando o cursor passa do cano.
    this.marker.x = aim.x; this.marker.z = aim.z;
    writeRifleAimTarget(this.end, player, aim, angle, this.muzzle);
    if (traceShot(player, this.muzzle, terrain, robots, HIT_LAYER.world, this.trace, height).blocked) return null;
    const dx = this.end.x - this.muzzle.x, dz = this.end.z - this.muzzle.z;
    const distance = Math.hypot(dx, dz);
    this.end.x = this.muzzle.x + dx / distance * COMBAT.rifle.range;
    this.end.z = this.muzzle.z + dz / distance * COMBAT.rifle.range;
    const robot = traceShot(this.muzzle, this.end, terrain, robots, RIFLE_MASK, this.trace, height).robot;
    // Captura visual só sob o cursor: um inimigo em outro ponto da linha não basta.
    if (!robot) return null;
    const radius = robotConfig(robot).radius;
    return (aim.x - robot.x) ** 2 + (aim.z - robot.z) ** 2 <= radius * radius ? robot : null;
  }
}

/** Estado visual mutável; nenhum timer, objeto ou render React por alvo/quadro. */
export class ReticleAnimation {
  targetId = -1;
  private time = 0;
  private blend = 0;
  spread: number = RETICLE.normalSpread;

  update(targetId: number, delta: number, visible: boolean) {
    if (!visible) { this.targetId = -1; this.time = this.blend = 0; this.spread = RETICLE.normalSpread; return; }
    if (targetId !== this.targetId) this.time = 0;
    this.targetId = targetId;
    this.time += delta;
    this.blend += ((targetId >= 0 ? 1 : 0) - this.blend) * (1 - Math.exp(-delta / RETICLE.transition));
    this.spread = RETICLE.normalSpread + this.blend * (RETICLE.targetSpread - RETICLE.normalSpread + RETICLE.pulseAmplitude * Math.sin(this.time * Math.PI * 2 / RETICLE.pulsePeriod));
  }
}

/** Unidades mundiais por pixel CSS; mesmo tamanho de cursor ao girar/aproximar a câmera. */
export function reticlePixelScale(projectionY: number, height: number, cameraDepth: number, orthographic: boolean) {
  return 2 * (orthographic ? 1 : Math.abs(cameraDepth)) / (projectionY * Math.max(height, 1));
}

/** Dash mantém a mesma mira; só bloqueios da sessão ou ponteiro inválido a escondem. */
export function reticleVisible(blocked: boolean, aimValid: boolean) {
  return !blocked && aimValid;
}

/** No facão, destaca só o alvo sob o cursor que cabe no arco/alcance real. */
export function meleeReticleTarget(player: Position, aim: Position, angle: number, terrain: Terrain, robots: Robot[]) {
  let closest: Robot | null = null, distance = Infinity;
  for (const robot of robots) {
    if (robot.hp <= 0) continue;
    const radius = robotConfig(robot).radius;
    if ((aim.x - robot.x) ** 2 + (aim.z - robot.z) ** 2 > radius * radius || !meleeCanHit(player, angle, robot, radius, terrain)) continue;
    const d = (robot.x - player.x) ** 2 + (robot.z - player.z) ** 2;
    if (d < distance) { closest = robot; distance = d; }
  }
  return closest;
}
