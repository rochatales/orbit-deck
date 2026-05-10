import { Color, MathUtils, MeshStandardMaterial, Vector3 } from "three";
import type { CharacterStateName } from "./CharacterInteractionState";
import type { MCPCharacter } from "./createMCPCharacter";
import { damp, dampAngle } from "../utils/math";

interface CharacterAnimatorTarget {
  data: { color: string };
  group: { position: Vector3; rotation: { y: number }; scale: Vector3 };
  ring: { scale: Vector3; material: MeshStandardMaterial };
  character: MCPCharacter;
}

export class CharacterAnimator {
  private readonly baseAccent: Color;
  private readonly successAccent = new Color("#4DD393");
  private highlightBlend = 0;
  private interactBlend = 0;
  private actionPulse = 0;
  private completedBlend = 0;

  constructor(private readonly target: CharacterAnimatorTarget, private readonly phaseOffset: number) {
    this.baseAccent = new Color(target.character.config.accentColor);
  }

  pulseAction() {
    this.actionPulse = 1;
  }

  update(delta: number, elapsedTime: number, state: CharacterStateName, playerPosition: Vector3) {
    const highlighted =
      state === "highlighted" || state === "interacting" || state === "actionTriggered" || state === "completed";
    const interacting = state === "interacting";
    const completed = state === "completed";

    this.highlightBlend = damp(this.highlightBlend, highlighted ? 1 : 0, 9, delta);
    this.interactBlend = damp(this.interactBlend, interacting ? 1 : 0, 10, delta);
    this.completedBlend = damp(this.completedBlend, completed ? 1 : 0, 6, delta);
    this.actionPulse = damp(this.actionPulse, state === "actionTriggered" ? 1 : 0, 12, delta);

    const idleLift = Math.sin(elapsedTime * 1.8 + this.phaseOffset) * 0.035;
    const activeLift = Math.sin(elapsedTime * 3.4 + this.phaseOffset) * 0.02 * (0.35 + this.interactBlend);
    this.target.group.position.y = idleLift + activeLift + this.actionPulse * 0.05;

    const scaleBoost = 1 + this.highlightBlend * 0.04 + this.actionPulse * 0.035;
    this.target.group.scale.setScalar(scaleBoost);

    const ringScale = 1 + this.highlightBlend * 0.16 + this.actionPulse * 0.08 + this.completedBlend * 0.12;
    this.target.ring.scale.setScalar(ringScale);

    const targetAccent = this.baseAccent.clone().lerp(this.successAccent, this.completedBlend);
    this.target.character.accentMaterials.forEach((material) => {
      material.emissive.copy(targetAccent).multiplyScalar(0.08 + this.highlightBlend * 0.18 + this.actionPulse * 0.22);
    });

    this.target.character.glowMaterials.forEach((material) => {
      material.emissive.copy(targetAccent).multiplyScalar(0.22 + this.highlightBlend * 0.18 + this.actionPulse * 0.26);
    });

    this.target.character.glassMaterials.forEach((material) => {
      material.emissive.copy(targetAccent).multiplyScalar(0.12 + this.highlightBlend * 0.14);
      material.opacity = MathUtils.lerp(0.38, 0.58, this.highlightBlend);
    });

    const ringMaterial = this.target.ring.material;
    ringMaterial.color.copy(targetAccent);
    ringMaterial.emissive.copy(targetAccent).multiplyScalar(0.16 + this.highlightBlend * 0.22 + this.completedBlend * 0.2);
    ringMaterial.opacity = MathUtils.lerp(0.9, 1, this.highlightBlend);

    const torsoPitch = Math.sin(elapsedTime * 1.6 + this.phaseOffset) * 0.03;
    this.target.character.base.torso.rotation.z = torsoPitch * 0.3;
    this.target.character.base.head.rotation.z = -torsoPitch * 0.4;
    this.target.character.base.head.rotation.x = this.interactBlend * 0.08;

    const orbitSpeed = elapsedTime * (0.7 + this.highlightBlend * 0.45);
    if (this.target.character.refs.orbitGroup) {
      this.target.character.refs.orbitGroup.rotation.y = orbitSpeed;
    }

    if (this.target.character.refs.floatingNodes) {
      this.target.character.refs.floatingNodes.rotation.y = orbitSpeed * 0.85;
      this.target.character.refs.floatingNodes.position.y = 1.32 + Math.sin(elapsedTime * 2.1 + this.phaseOffset) * 0.04;
    }

    if (this.target.character.refs.floatingCards) {
      this.target.character.refs.floatingCards.rotation.y = orbitSpeed * 0.65;
      this.target.character.refs.floatingCards.position.y = 1.18 + Math.sin(elapsedTime * 2.6 + this.phaseOffset) * 0.05;
    }

    if (this.target.character.refs.socialIcons) {
      this.target.character.refs.socialIcons.rotation.y = -orbitSpeed;
      this.target.character.refs.socialIcons.position.y = 1.18 + Math.sin(elapsedTime * 3 + this.phaseOffset) * 0.05;
    }

    if (this.target.character.refs.calendarBlocks) {
      this.target.character.refs.calendarBlocks.rotation.y = Math.sin(elapsedTime * 1.2 + this.phaseOffset) * 0.3;
    }

    if (this.target.character.refs.waveform) {
      this.target.character.refs.waveform.children.forEach((child, index) => {
        child.scale.y = 0.85 + Math.sin(elapsedTime * 5 + index * 0.45 + this.phaseOffset) * 0.28;
      });
    }

    if (this.target.character.refs.designFrames) {
      this.target.character.refs.designFrames.rotation.y = orbitSpeed * 0.8;
    }

    if (this.target.character.refs.layerPanels) {
      this.target.character.refs.layerPanels.rotation.y = Math.sin(elapsedTime * 1.5 + this.phaseOffset) * 0.26;
      this.target.character.refs.layerPanels.position.y = 1.04 + Math.sin(elapsedTime * 2.2 + this.phaseOffset) * 0.03;
    }

    if (this.target.character.refs.heldPhone) {
      this.target.character.refs.heldPhone.rotation.z = -0.08 + Math.sin(elapsedTime * 3.4 + this.phaseOffset) * 0.08;
    }

    if (this.target.character.refs.heldTablet) {
      this.target.character.refs.heldTablet.rotation.z = 0.05 + Math.sin(elapsedTime * 2.5 + this.phaseOffset) * 0.05;
    }

    if (this.target.character.refs.brandBook) {
      this.target.character.refs.brandBook.rotation.y = -0.45 + Math.sin(elapsedTime * 1.7 + this.phaseOffset) * 0.12;
    }

    if (this.target.character.refs.voiceCard) {
      this.target.character.refs.voiceCard.position.y = 1.12 + Math.sin(elapsedTime * 2.1 + this.phaseOffset) * 0.03;
    }

    if (this.target.character.refs.backpackAntenna) {
      this.target.character.refs.backpackAntenna.rotation.z = -0.18 + Math.sin(elapsedTime * 3 + this.phaseOffset) * 0.14;
    }

    if (interacting) {
      const dx = playerPosition.x - this.target.group.position.x;
      const dz = playerPosition.z - this.target.group.position.z;
      const targetRotation = Math.atan2(dx, dz);
      this.target.group.rotation.y = dampAngle(this.target.group.rotation.y, targetRotation, 8, delta);
    } else {
      this.target.group.rotation.y = dampAngle(
        this.target.group.rotation.y,
        this.target.character.defaultRotationY,
        7,
        delta
      );
    }
  }
}
