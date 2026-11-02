import { COMBAT, HIT_LAYER, RIFLE_MASK, writeRifleAimTarget, writeRifleMuzzle } from '../../combat/config';
import { traceShot, type Robot, type ShotTrace } from '../../combat/simulation';
import type { Position, Terrain } from '../../combat/navigation';
import type { WeaponMuzzleOffset } from '../../state/playerWeaponPose';

export const RETICLE = {
  color: '#ffffff', targetColor: '#ffe2ac', targetScale: .8,
  transition: .09, pulsePeriod: .85, pulseAmplitude: .045
} as const;

/** Consulta visual sem efeitos: usa os mesmos volumes, alcance e proteção do cano que o tiro. */
export class ReticleAim {
  readonly marker: Position = { x: 0, z: 0 };
  private readonly muzzle: Position = { x: 0, z: 0 };
  private readonly end: Position = { x: 0, z: 0 };
  private readonly trace: ShotTrace = { to: { x: 0, z: 0 }, robot: null, blocked: false };

  target(player: Position, aim: Position, angle: number, pose: WeaponMuzzleOffset, height: number, terrain: Terrain, robots: Robot[]) {
    writeRifleMuzzle(this.muzzle, player.x, player.z, angle, pose.valid ? pose : undefined);
    writeRifleAimTarget(this.marker, player, aim, angle, this.muzzle);
    if (traceShot(player, this.muzzle, terrain, robots, HIT_LAYER.world, this.trace, height).blocked) return null;
    const dx = this.marker.x - this.muzzle.x, dz = this.marker.z - this.muzzle.z;
    const distance = Math.hypot(dx, dz);
    this.end.x = this.muzzle.x + dx / distance * COMBAT.rifle.range;
    this.end.z = this.muzzle.z + dz / distance * COMBAT.rifle.range;
    return traceShot(this.muzzle, this.end, terrain, robots, RIFLE_MASK, this.trace, height).robot;
  }
}

/** Estado visual mutável; nenhum timer, objeto ou render React por alvo/quadro. */
export class ReticleAnimation {
  targetId = -1;
  private time = 0;
  private blend = 0;
  scale = 1;

  update(targetId: number, delta: number, visible: boolean) {
    if (!visible) { this.targetId = -1; this.time = this.blend = 0; this.scale = 1; return; }
    if (targetId !== this.targetId) this.time = 0;
    this.targetId = targetId;
    this.time += delta;
    this.blend += ((targetId >= 0 ? 1 : 0) - this.blend) * (1 - Math.exp(-delta / RETICLE.transition));
    this.scale = 1 + this.blend * (RETICLE.targetScale - 1 + RETICLE.pulseAmplitude * Math.sin(this.time * Math.PI * 2 / RETICLE.pulsePeriod));
  }
}

/** Unidades mundiais por pixel CSS; mesmo tamanho de cursor ao girar/aproximar a câmera. */
export function reticlePixelScale(projectionY: number, height: number, cameraDepth: number, orthographic: boolean) {
  return 2 * (orthographic ? 1 : Math.abs(cameraDepth)) / (projectionY * Math.max(height, 1));
}
