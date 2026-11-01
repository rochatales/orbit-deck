import { Quaternion, Vector3, type Object3D } from 'three';
import type { WeaponMuzzleOffset } from '../../state/playerWeaponPose';

/** Transform glTF Y-up → glTF Y-up medido em Aim_Rifle q1 (não o quaternion Blender). */
export const RIFLE_HAND_TRANSFORM = {
  position: [0, 0.07612, -0.00278],
  quaternion: [-0.37602, -0.54122, -0.48260, 0.57688],
  scale: [0.60913, 0.60913, 0.60913]
} as const;

/** Executado só ao carregar/trocar a cena. Geometria e materiais do cache permanecem compartilhados. */
export function attachRifle(character: Object3D, rifle: Object3D): boolean {
  const hand = character.getObjectByName('mixamorig:RightHand') ?? character.getObjectByName('mixamorigRightHand');
  if (!hand) return false;
  rifle.name = 'RifleLaser';
  rifle.position.fromArray(RIFLE_HAND_TRANSFORM.position);
  rifle.quaternion.fromArray(RIFLE_HAND_TRANSFORM.quaternion).normalize();
  rifle.scale.fromArray(RIFLE_HAND_TRANSFORM.scale);
  hand.add(rifle);
  return true;
}

export function detachRifle(rifle: Object3D) {
  rifle.removeFromParent();
}

/** Corrige só a mira parada no tronco; a corrida mantém a pose autorada de transporte do rifle. */
export class RifleAimRig {
  readonly muzzle: Object3D | null;
  private readonly torso: Object3D | null;
  private readonly point = new Vector3();
  private readonly target = new Vector3();
  private readonly direction = new Vector3();
  private readonly wanted = new Vector3();
  private readonly parentRotation = new Quaternion();
  private readonly inverseParent = new Quaternion();
  private readonly correction = new Quaternion();
  constructor(private readonly character: Object3D, rifle: Object3D, private readonly footOffset: number) {
    this.muzzle = rifle.getObjectByName('Muzzle') ?? null;
    this.torso = character.getObjectByName('mixamorig:Spine2') ?? character.getObjectByName('mixamorigSpine2') ?? null;
  }
  update(out: WeaponMuzzleOffset, player: { x: number; z: number }, angle: number, aim: { x: number; z: number } | null, align: boolean) {
    const muzzle = this.muzzle, torso = this.torso;
    if (!muzzle) { out.valid = false; return; }
    this.character.updateWorldMatrix(true, true);
    if (align && torso?.parent) {
      // Leva o alvo físico ao espaço do GLB, sem herdar a translação visual da interpolação.
      const sin = Math.sin(angle), cos = Math.cos(angle);
      const dx = aim ? aim.x - player.x : 0, dz = aim ? aim.z - player.z : 32;
      const near = !aim || Math.hypot(dx, dz) <= .9;
      let x = near ? 0 : dx * cos - dz * sin, z = near ? 32 : dx * sin + dz * cos;
      // O corpo faz o giro grande. O tronco só acompanha dentro de ±35° durante a transição.
      const yaw = Math.max(-.61, Math.min(.61, Math.atan2(x, z)));
      const distance = Math.max(2, Math.hypot(x, z));
      x = Math.sin(yaw) * distance; z = Math.cos(yaw) * distance;
      for (let i = 0; i < 3; i++) {
        muzzle.getWorldPosition(this.point); this.character.worldToLocal(this.point);
        this.target.set(near ? this.point.x : x, this.point.y, near ? this.point.z + 32 : z); this.character.localToWorld(this.target);
        muzzle.getWorldPosition(this.point); muzzle.getWorldDirection(this.direction);
        this.wanted.subVectors(this.target, this.point).normalize();
        this.correction.setFromUnitVectors(this.direction, this.wanted);
        torso.parent.getWorldQuaternion(this.parentRotation);
        this.inverseParent.copy(this.parentRotation).invert();
        this.correction.premultiply(this.inverseParent).multiply(this.parentRotation);
        torso.quaternion.premultiply(this.correction).normalize();
        torso.updateWorldMatrix(true, true);
      }
    }
    muzzle.getWorldPosition(this.point); this.character.worldToLocal(this.point);
    out.side = this.point.x; out.forward = this.point.z;
    out.height = this.point.y + this.footOffset; out.valid = true;
  }
}
