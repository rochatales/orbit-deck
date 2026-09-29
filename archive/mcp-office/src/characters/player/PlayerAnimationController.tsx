import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import { Mesh, MeshStandardMaterial, Object3D, type Group } from "three";
import { damp } from "../../utils/math";
import { PLAYER_ANIMATION, PLAYER_GLB_PART_NAMES } from "./playerAnimationConfig";
import type { PlayerMotionState } from "./playerConfig";

interface TransformState {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

interface NamedPartSet {
  head: Object3D | null;
  body: Object3D | null;
  leftArm: Object3D | null;
  rightArm: Object3D | null;
  leftHand: Object3D | null;
  rightHand: Object3D | null;
  leftLeg: Object3D | null;
  rightLeg: Object3D | null;
  leftBoot: Object3D | null;
  rightBoot: Object3D | null;
  backpack: Object3D | null;
  chestDevice: Object3D | null;
  visor: Object3D | null;
}

interface MaterialSet {
  visor: MeshStandardMaterial[];
  chest: MeshStandardMaterial[];
}

interface PlayerAnimationControllerProps {
  motionRef: MutableRefObject<PlayerMotionState>;
  visualRef: MutableRefObject<Group | null>;
  glbSceneRef: MutableRefObject<Object3D | null>;
}

function snapshotTransform(object: Object3D): TransformState {
  return {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: [object.scale.x, object.scale.y, object.scale.z]
  };
}

function restoreTransform(object: Object3D, base: TransformState) {
  object.position.set(base.position[0], base.position[1], base.position[2]);
  object.rotation.set(base.rotation[0], base.rotation[1], base.rotation[2]);
  object.scale.set(base.scale[0], base.scale[1], base.scale[2]);
}

function findNamedPart(scene: Object3D, candidates: readonly string[]) {
  const lowered = candidates.map((candidate) => candidate.toLowerCase());
  let found: Object3D | null = null;

  scene.traverse((object) => {
    if (found) {
      return;
    }

    const objectName = object.name.toLowerCase();
    if (lowered.some((candidate) => objectName === candidate || objectName.includes(candidate))) {
      found = object;
    }
  });

  return found;
}

function resolveNamedParts(scene: Object3D): NamedPartSet {
  return {
    head: findNamedPart(scene, PLAYER_GLB_PART_NAMES.head),
    body: findNamedPart(scene, PLAYER_GLB_PART_NAMES.body),
    leftArm: findNamedPart(scene, PLAYER_GLB_PART_NAMES.leftArm),
    rightArm: findNamedPart(scene, PLAYER_GLB_PART_NAMES.rightArm),
    leftHand: findNamedPart(scene, PLAYER_GLB_PART_NAMES.leftHand),
    rightHand: findNamedPart(scene, PLAYER_GLB_PART_NAMES.rightHand),
    leftLeg: findNamedPart(scene, PLAYER_GLB_PART_NAMES.leftLeg),
    rightLeg: findNamedPart(scene, PLAYER_GLB_PART_NAMES.rightLeg),
    leftBoot: findNamedPart(scene, PLAYER_GLB_PART_NAMES.leftBoot),
    rightBoot: findNamedPart(scene, PLAYER_GLB_PART_NAMES.rightBoot),
    backpack: findNamedPart(scene, PLAYER_GLB_PART_NAMES.backpack),
    chestDevice: findNamedPart(scene, PLAYER_GLB_PART_NAMES.chestDevice),
    visor: findNamedPart(scene, PLAYER_GLB_PART_NAMES.visor)
  };
}

function collectMaterials(scene: Object3D): MaterialSet {
  const visor: MeshStandardMaterial[] = [];
  const chest: MeshStandardMaterial[] = [];

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const objectName = object.name.toLowerCase();

    materials.forEach((material) => {
      if (!(material instanceof MeshStandardMaterial)) {
        return;
      }

      const materialName = material.name.toLowerCase();
      if (materialName.includes("visor") || objectName.includes("visor")) {
        visor.push(material);
      }

      if (
        materialName.includes("techaccent") ||
        materialName.includes("device") ||
        materialName.includes("module") ||
        objectName.includes("chest") ||
        objectName.includes("chestdevice")
      ) {
        chest.push(material);
      }
    });
  });

  return { visor, chest };
}

export function PlayerAnimationController({
  motionRef,
  visualRef,
  glbSceneRef
}: PlayerAnimationControllerProps) {
  const initializedSceneRef = useRef<Object3D | null>(null);
  const partRefs = useRef<NamedPartSet | null>(null);
  const baseTransforms = useRef(new Map<Object3D, TransformState>());
  const baseMaterialIntensity = useRef(new Map<MeshStandardMaterial, number>());
  const materialsRef = useRef<MaterialSet>({ visor: [], chest: [] });
  const walkBlend = useRef(0);
  const interactBlend = useRef(0);
  const actionBlend = useRef(0);
  const warnedMissingLimbs = useRef(false);

  useFrame((state, delta) => {
    const visualGroup = visualRef.current;
    const glbScene = glbSceneRef.current;
    if (!visualGroup || !glbScene) {
      return;
    }

    if (initializedSceneRef.current !== glbScene) {
      initializedSceneRef.current = glbScene;
      baseTransforms.current.clear();
      baseMaterialIntensity.current.clear();

      const namedParts = resolveNamedParts(glbScene);
      partRefs.current = namedParts;

      [visualGroup, ...Object.values(namedParts).filter((part): part is Object3D => part !== null)].forEach((object) => {
        baseTransforms.current.set(object, snapshotTransform(object));
      });

      materialsRef.current = collectMaterials(glbScene);
      [...materialsRef.current.visor, ...materialsRef.current.chest].forEach((material) => {
        baseMaterialIntensity.current.set(material, material.emissiveIntensity);
      });

      const hasSeparateLimbs = Boolean(
        namedParts.leftArm ||
          namedParts.rightArm ||
          namedParts.leftHand ||
          namedParts.rightHand ||
          namedParts.leftLeg ||
          namedParts.rightLeg ||
          namedParts.leftBoot ||
          namedParts.rightBoot
      );

      if (!hasSeparateLimbs && !warnedMissingLimbs.current) {
        warnedMissingLimbs.current = true;
        console.warn("GLB has no separate named limbs. Using whole-body procedural animation only.");
      }
    }

    const motion = motionRef.current;
    const time = state.clock.elapsedTime;
    const speedAlpha = motion.speedAlpha;
    const isWalking = motion.animationState === "walking";
    const isInteracting = motion.animationState === "interacting";
    const isActionTriggered = motion.animationState === "actionTriggered";

    walkBlend.current = damp(walkBlend.current, isWalking ? 1 : 0, 10, delta);
    interactBlend.current = damp(interactBlend.current, isInteracting ? 1 : 0, 10, delta);
    actionBlend.current = damp(actionBlend.current, isActionTriggered ? 1 : 0, 14, delta);

    const idleBob = Math.sin(time * PLAYER_ANIMATION.idleBobSpeed) * PLAYER_ANIMATION.idleBobAmplitude;
    const walkPhase = time * PLAYER_ANIMATION.walkBobSpeed;
    const walkBob = Math.sin(walkPhase) * PLAYER_ANIMATION.walkBobAmplitude * walkBlend.current * speedAlpha;
    const bodySway = Math.sin(walkPhase * 0.5) * 0.04 * walkBlend.current;
    const bodyLean = -PLAYER_ANIMATION.bodyLeanAmount * speedAlpha * walkBlend.current;
    const actionBounce = Math.sin(time * 18) * PLAYER_ANIMATION.actionBounceAmount * actionBlend.current;
    const breathing = Math.sin(time * 1.35 + 0.45) * 0.018;

    motion.visualBob = idleBob + walkBob + actionBounce * 0.35;
    motion.bodyLean = bodyLean;

    const visualBase = baseTransforms.current.get(visualGroup);
    if (visualBase) {
      restoreTransform(visualGroup, visualBase);
      visualGroup.position.y += idleBob + walkBob + actionBounce * 0.35;
      visualGroup.rotation.y += bodySway * 0.35;
      visualGroup.rotation.x += bodyLean + interactBlend.current * PLAYER_ANIMATION.interactionTilt * 0.28;
      visualGroup.rotation.z += -bodySway * 0.4;
    }

    const namedParts = partRefs.current;
    if (!namedParts) {
      return;
    }

    Object.values(namedParts).forEach((part) => {
      if (!part) {
        return;
      }
      const base = baseTransforms.current.get(part);
      if (base) {
        restoreTransform(part, base);
      }
    });

    const armSwing = Math.sin(walkPhase) * PLAYER_ANIMATION.armSwingAmplitude * walkBlend.current * speedAlpha;
    const legSwing = Math.sin(walkPhase) * PLAYER_ANIMATION.legSwingAmplitude * walkBlend.current * speedAlpha;
    const handSwing = Math.sin(walkPhase) * PLAYER_ANIMATION.handSwingAmplitude * walkBlend.current * speedAlpha;
    const stepLift = Math.abs(Math.sin(walkPhase)) * 0.035 * walkBlend.current * speedAlpha;
    const backpackBounce =
      Math.abs(Math.sin(walkPhase)) * PLAYER_ANIMATION.backpackBounceAmount * walkBlend.current * speedAlpha;

    if (namedParts.head) {
      namedParts.head.position.y += breathing * 0.25 + actionBounce * 0.1;
      namedParts.head.rotation.x += interactBlend.current * PLAYER_ANIMATION.interactionTilt + actionBlend.current * 0.08;
      namedParts.head.rotation.z += -bodySway * 0.18;
    }

    if (namedParts.body) {
      namedParts.body.rotation.x += bodyLean + interactBlend.current * PLAYER_ANIMATION.interactionTilt * 0.2;
      namedParts.body.rotation.z += bodySway * 0.3;
    }

    if (namedParts.leftArm) {
      namedParts.leftArm.rotation.x += isInteracting ? 0.04 : armSwing + actionBlend.current * 0.1;
    }

    if (namedParts.rightArm) {
      namedParts.rightArm.rotation.x += isInteracting ? -0.02 : -armSwing + actionBlend.current * 0.06;
    }

    if (namedParts.leftHand) {
      namedParts.leftHand.rotation.x += handSwing * 0.8 + actionBlend.current * 0.08;
      namedParts.leftHand.rotation.z += handSwing * 0.3;
    }

    if (namedParts.rightHand) {
      namedParts.rightHand.rotation.x += -handSwing * 0.8 + actionBlend.current * 0.04;
      namedParts.rightHand.rotation.z += -handSwing * 0.3;
    }

    if (namedParts.leftLeg) {
      namedParts.leftLeg.rotation.x += -legSwing;
    }

    if (namedParts.rightLeg) {
      namedParts.rightLeg.rotation.x += legSwing;
    }

    if (namedParts.leftBoot) {
      namedParts.leftBoot.position.y += stepLift;
      namedParts.leftBoot.rotation.x += -legSwing * 0.45;
    }

    if (namedParts.rightBoot) {
      namedParts.rightBoot.position.y += Math.abs(Math.sin(walkPhase + Math.PI)) * 0.035 * walkBlend.current * speedAlpha;
      namedParts.rightBoot.rotation.x += legSwing * 0.45;
    }

    if (namedParts.backpack) {
      namedParts.backpack.position.y += backpackBounce;
      namedParts.backpack.rotation.x += backpackBounce * 0.55 + actionBlend.current * 0.05;
    }

    const visorPulse =
      (Math.sin(time * 2.8) * 0.5 + 0.5) * PLAYER_ANIMATION.visorPulseAmplitude +
      walkBlend.current * 0.08 +
      actionBlend.current * 0.12;
    const chestPulse = isInteracting
      ? PLAYER_ANIMATION.chestGlowActive
      : PLAYER_ANIMATION.chestGlowIdle + walkBlend.current * 0.12 + actionBlend.current * 0.3;

    materialsRef.current.visor.forEach((material) => {
      const baseIntensity = baseMaterialIntensity.current.get(material) ?? 0.08;
      material.emissiveIntensity = baseIntensity + visorPulse;
    });

    materialsRef.current.chest.forEach((material) => {
      const baseIntensity = baseMaterialIntensity.current.get(material) ?? 0.08;
      material.emissiveIntensity = baseIntensity + chestPulse;
    });
  });

  return null;
}
