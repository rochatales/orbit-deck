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

/** Encaixe de cintura calibrado no Hips do Idle: punho em (-0,28; 0,64; -0,035), cano 60° para baixo, livre do piso durante a passada.
 * Mesmo tamanho mundial da arma empunhada; o transform é fixo e acompanha só o quadril. */
export const RIFLE_HOLSTER_TRANSFORM = {
  position: [-0.13889160163930517, 0.039628645550470465, 0.10424504329431789],
  quaternion: [0.4969764461861439, 0.3233252003945658, -0.1735340638570748, 0.7863594349970252],
  scale: [0.6091301170549727, 0.6091300347976606, 0.6091299628849569]
} as const;

export function attachHolsteredRifle(character: Object3D, rifle: Object3D): boolean {
  const hips = character.getObjectByName('mixamorig:Hips') ?? character.getObjectByName('mixamorigHips');
  if (!hips) return false;
  rifle.name = 'RifleLaserHolstered';
  rifle.position.fromArray(RIFLE_HOLSTER_TRANSFORM.position);
  rifle.quaternion.fromArray(RIFLE_HOLSTER_TRANSFORM.quaternion).normalize();
  rifle.scale.fromArray(RIFLE_HOLSTER_TRANSFORM.scale);
  hips.add(rifle);
  return true;
}

export function detachRifle(rifle: Object3D) {
  rifle.removeFromParent();
}

/** Corrige só a mira parada no tronco; a corrida mantém a pose autorada de transporte do rifle. */
export class RifleAimRig {
  readonly muzzle: Object3D | null;
  private readonly torso: Object3D | null;
  private readonly head: Object3D | null;
  private readonly point = new Vector3();
  private readonly target = new Vector3();
  private readonly direction = new Vector3();
  private readonly wanted = new Vector3();
  private readonly parentRotation = new Quaternion();
  private readonly inverseParent = new Quaternion();
  private readonly correction = new Quaternion();
  constructor(private readonly character: Object3D, rifle: Object3D, private readonly footOffset: number, private readonly headOffset?: {side:number;forward:number;height:number}) {
    this.muzzle = rifle.getObjectByName('Muzzle') ?? null;
    this.head = character.getObjectByName('mixamorig:Head') ?? character.getObjectByName('mixamorigHead') ?? null;
    this.torso = character.getObjectByName('mixamorig:Spine2') ?? character.getObjectByName('mixamorigSpine2') ?? null;
  }
  update(out: WeaponMuzzleOffset, player: { x: number; z: number }, angle: number, aim: { x: number; z: number } | null, align: boolean, headOut?: WeaponMuzzleOffset) {
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
    if (headOut && this.head && this.headOffset) {
      this.head.getWorldPosition(this.point);this.character.worldToLocal(this.point);
      headOut.side=this.point.x+this.headOffset.side;headOut.forward=this.point.z+this.headOffset.forward;
      headOut.height=this.point.y+this.footOffset+this.headOffset.height;headOut.valid=true;
    }
  }
}
