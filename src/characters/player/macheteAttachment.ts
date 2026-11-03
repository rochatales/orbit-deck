import { Matrix4, Quaternion, Vector3, type Object3D } from 'three';
/** glTF Y-up: pega nas duas palmas em Machete_Idle t=0, arma de 1,082 m. */
export const MACHETE_HAND_TRANSFORM = {
  position: [.15339095073611822, .04704156155241928, -.0628639780370189],
  quaternion: [.21932515139981174, .17682659612154417, .6022246453925125, .7469634137380001],
  scale: [.6574925675997182, .6574925675997182, .6574925675997182]
} as const;
export function attachMachete(character: Object3D, weapon: Object3D) {
  const hand = character.getObjectByName('mixamorigRightHand') ?? character.getObjectByName('mixamorig:RightHand');
  if (!hand) return false;
  weapon.name = 'PlayerMachete';
  weapon.position.fromArray(MACHETE_HAND_TRANSFORM.position);
  weapon.quaternion.fromArray(MACHETE_HAND_TRANSFORM.quaternion).normalize();
  weapon.scale.fromArray(MACHETE_HAND_TRANSFORM.scale);
  hand.add(weapon);
  return true;
}

/** Facão entre braço e cintura esquerda, mesma escala da versão empunhada.
 * Breathing_Idle: Grip_R em (-0,26; 0,76; -0,035), lâmina para trás,
 * 21° abaixo da horizontal, face plana junto à lateral do corpo. */
export const MACHETE_HOLSTER_TILT = 1.2;
export const MACHETE_HOLSTER_TRANSFORM = {
  position: [-.1595399623819714, .047324204402609094, -.14840342657680608],
  quaternion: [.4022761616528928, .5824139320455158, .4116349056473449, .574042338184172],
  scale: [.6574924326092453, .6574924326093743, .6574925676275732]
} as const;
export function attachHolsteredMachete(character: Object3D, weapon: Object3D) {
  const hips = character.getObjectByName('mixamorigHips') ?? character.getObjectByName('mixamorig:Hips');
  if (!hips) return false;
  weapon.name = 'PlayerMacheteHolstered';
  weapon.position.fromArray(MACHETE_HOLSTER_TRANSFORM.position);
  weapon.quaternion.fromArray(MACHETE_HOLSTER_TRANSFORM.quaternion).normalize();
  weapon.scale.fromArray(MACHETE_HOLSTER_TRANSFORM.scale);
  hips.add(weapon);
  return true;
}

/** Encaixe estável na locomoção; no Dash acompanha integralmente o Hips,
 * como o rifle pendurado. Ao sair, volta suavemente à inclinação aprovada. */
export class MacheteHolsterRig {
  private readonly hips;
  private readonly anchor = new Vector3(0, .21, 0);
  private readonly offset = new Vector3();
  private readonly parentRotation = new Quaternion();
  private readonly rotation = new Quaternion();
  private readonly tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), MACHETE_HOLSTER_TILT)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2));
  private readonly boneRotation = new Quaternion().fromArray(MACHETE_HOLSTER_TRANSFORM.quaternion).normalize();
  private bodyRotationBlend = 0;
  constructor(private character: Object3D, private weapon: Object3D) {
    this.hips = character.getObjectByName('mixamorigHips') ?? character.getObjectByName('mixamorig:Hips');
    this.anchor.multiply(this.offset.fromArray(MACHETE_HOLSTER_TRANSFORM.scale))
      .applyQuaternion(this.rotation.fromArray(MACHETE_HOLSTER_TRANSFORM.quaternion).normalize())
      .add(this.offset.fromArray(MACHETE_HOLSTER_TRANSFORM.position));
  }
  update(dashing = false, delta = 0) {
    if (!this.hips || this.weapon.parent !== this.hips) return;
    // Não anula as rotações do clipe durante a acrobacia; pausa não avança a volta.
    this.bodyRotationBlend = dashing ? 1 : this.bodyRotationBlend * Math.exp(-24 * Math.max(0, Math.min(delta, .05)));
    this.character.getWorldQuaternion(this.rotation); this.rotation.multiply(this.tilt);
    this.hips.getWorldQuaternion(this.parentRotation).invert();
    this.weapon.quaternion.copy(this.parentRotation).multiply(this.rotation).normalize().slerp(this.boneRotation, this.bodyRotationBlend);
    this.offset.set(0, .21, 0).multiply(this.weapon.scale).applyQuaternion(this.weapon.quaternion);
    this.weapon.position.copy(this.anchor).sub(this.offset);
  }
}

/** Duas mãos do próprio clipe conduzem a pega; sem escala variável ou alocação por quadro. */
export class MacheteGripRig {
  private readonly hand;
  private readonly rightIndex;
  private readonly rightThumb;
  private readonly leftIndex;
  private readonly leftThumb;
  private readonly leftArm; private readonly leftForearm; private readonly leftHand;
  private shoulder = new Vector3(); private elbow = new Vector3(); private wrist = new Vector3();
  private grip = new Vector3(); private goal = new Vector3(); private elbowGoal = new Vector3();
  private direction = new Vector3(); private bend = new Vector3(); private from = new Vector3(); private to = new Vector3();
  private jointWorld = new Quaternion(); private jointParent = new Quaternion(); private delta = new Quaternion(); private handWorld = new Quaternion();
  private right = new Vector3(); private left = new Vector3(); private temp = new Vector3();
  private x = new Vector3(); private y = new Vector3(); private z = new Vector3();
  private lastZ = new Vector3(); private hasLast = false;
  private basis = new Matrix4(); private parentRotation = new Quaternion(); private rotation = new Quaternion();
  private offset = new Vector3();
  constructor(private character: Object3D, private weapon: Object3D) {
    const bone = (name: string) => character.getObjectByName('mixamorig' + name) ?? character.getObjectByName('mixamorig:' + name);
    this.hand = bone('RightHand'); this.rightIndex = bone('RightHandIndex1'); this.rightThumb = bone('RightHandThumb2');
    this.leftIndex = bone('LeftHandIndex1'); this.leftThumb = bone('LeftHandThumb2');
    this.leftArm = bone('LeftArm'); this.leftForearm = bone('LeftForeArm'); this.leftHand = bone('LeftHand');
  }
  update(twoHands = true) {
    if (!twoHands) {
      this.weapon.position.fromArray(MACHETE_HAND_TRANSFORM.position);
      this.weapon.quaternion.fromArray(MACHETE_HAND_TRANSFORM.quaternion).normalize();
      this.hasLast = false;
      return;
    }
    if (!this.hand || !this.rightIndex || !this.rightThumb || !this.leftIndex || !this.leftThumb) return;
    this.character.updateWorldMatrix(true, true);
    this.rightIndex.getWorldPosition(this.right); this.rightThumb.getWorldPosition(this.temp); this.right.add(this.temp).multiplyScalar(.5);
    this.leftIndex.getWorldPosition(this.left); this.leftThumb.getWorldPosition(this.temp); this.left.add(this.temp).multiplyScalar(.5);
    this.y.copy(this.left).sub(this.right);
    if (this.y.lengthSq() < 1e-8) return;
    this.y.normalize(); this.hand.getWorldQuaternion(this.parentRotation);
    this.z.set(0, 0, 1).applyQuaternion(this.parentRotation); this.z.addScaledVector(this.y, -this.z.dot(this.y));
    if (this.z.lengthSq() < 1e-8) this.z.copy(this.lastZ).addScaledVector(this.y, -this.lastZ.dot(this.y));
    if (this.z.lengthSq() < 1e-8) return;
    this.z.normalize(); if (this.hasLast && this.z.dot(this.lastZ) < 0) this.z.negate();
    this.lastZ.copy(this.z); this.hasLast = true;
    this.x.crossVectors(this.y, this.z).normalize(); this.basis.makeBasis(this.x, this.y, this.z);
    this.rotation.setFromRotationMatrix(this.basis); this.parentRotation.invert().multiply(this.rotation);
    this.weapon.quaternion.copy(this.parentRotation);
    this.offset.set(0, .21 * MACHETE_HAND_TRANSFORM.scale[0], 0).applyQuaternion(this.parentRotation);
    this.hand.worldToLocal(this.right); this.weapon.position.copy(this.right).sub(this.offset);
    this.fitLeftHand();
  }
  /** IK analítica de dois segmentos só no braço esquerdo: o cabo curto não exige
   * esticar a arma quando a animação abre as mãos durante o corte. */
  private fitLeftHand() {
    const arm = this.leftArm, forearm = this.leftForearm, hand = this.leftHand;
    if (!arm || !forearm || !hand) return;
    this.weapon.updateWorldMatrix(true, true);
    this.grip.set(0, .39, 0); this.weapon.localToWorld(this.grip);
    arm.getWorldPosition(this.shoulder); forearm.getWorldPosition(this.elbow); hand.getWorldPosition(this.wrist);
    hand.getWorldQuaternion(this.handWorld);
    this.goal.copy(this.grip).sub(this.left).add(this.wrist);
    const a = this.shoulder.distanceTo(this.elbow), b = this.elbow.distanceTo(this.wrist);
    this.direction.copy(this.goal).sub(this.shoulder);
    const distance = this.direction.length();
    if (distance < 1e-8 || a < 1e-8 || b < 1e-8) return;
    this.direction.multiplyScalar(1 / distance);
    const d = Math.max(Math.abs(a - b) + 1e-6, Math.min(a + b - 1e-6, distance));
    this.bend.copy(this.elbow).sub(this.shoulder); this.bend.addScaledVector(this.direction, -this.bend.dot(this.direction));
    if (this.bend.lengthSq() < 1e-8) return;
    this.bend.normalize();
    const along = (a * a + d * d - b * b) / (2 * d), across = Math.sqrt(Math.max(0, a * a - along * along));
    this.elbowGoal.copy(this.shoulder).addScaledVector(this.direction, along).addScaledVector(this.bend, across);
    this.from.copy(this.elbow).sub(this.shoulder).normalize(); this.to.copy(this.elbowGoal).sub(this.shoulder).normalize();
    this.rotateJoint(arm);
    forearm.getWorldPosition(this.elbow); hand.getWorldPosition(this.wrist);
    this.from.copy(this.wrist).sub(this.elbow).normalize(); this.to.copy(this.goal).sub(this.elbow).normalize();
    this.rotateJoint(forearm);
    forearm.getWorldQuaternion(this.jointParent); this.jointParent.invert();
    hand.quaternion.copy(this.jointParent).multiply(this.handWorld);
  }
  private rotateJoint(joint: Object3D) {
    if (!joint.parent) return;
    this.delta.setFromUnitVectors(this.from, this.to); joint.getWorldQuaternion(this.jointWorld);
    this.jointWorld.premultiply(this.delta); joint.parent.getWorldQuaternion(this.jointParent);
    joint.quaternion.copy(this.jointParent.invert()).multiply(this.jointWorld);
    joint.updateWorldMatrix(false, true);
  }

}
