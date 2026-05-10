import { useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type AnimationAction,
  type AnimationMixer,
  type Material,
  type Object3D
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { debugGLBHierarchy } from "./debugGLBHierarchy";
import { FallbackCharacter } from "./fallback/FallbackCharacter";
import type { CharacterFallbackType } from "./characterAssetConfig";

export type GLBCharacterAnimationState =
  | "idle"
  | "walking"
  | "interacting"
  | "actionTriggered"
  | "falling"
  | "highlighted"
  | "completed";

export type GLBActionMap = Partial<Record<string, AnimationAction | null>>;

interface GLBCharacterProps {
  assetPath: string;
  scale?: number | [number, number, number];
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  name: string;
  accentColor: string;
  animationState?: GLBCharacterAnimationState;
  fallbackType: CharacterFallbackType;
  fallbackLabel?: string;
  onSceneReady?: (scene: Object3D) => void;
  onAnimationsReady?: (actions: GLBActionMap, mixer: AnimationMixer) => void;
}

interface PreparedScene {
  scene: Object3D;
  visorMaterials: MeshStandardMaterial[];
  techMaterials: MeshStandardMaterial[];
}

const inspectedAssets = new Set<string>();

class CharacterAssetErrorBoundary extends Component<
  {
    fallback: ReactNode;
    children: ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Falling back to primitive character asset.", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function getMaterialRole(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("mat_visor")) {
    return "visor";
  }
  if (lower.includes("mat_techaccent")) {
    return "tech";
  }
  if (lower.includes("mat_helmet")) {
    return "helmet";
  }
  if (lower.includes("mat_suit")) {
    return "suit";
  }
  if (lower.includes("mat_gloves") || lower.includes("mat_boots")) {
    return "gear";
  }
  if (lower.includes("mat_backpack")) {
    return "backpack";
  }
  if (lower.includes("mat_accessory")) {
    return "accessory";
  }
  return "default";
}

function toStandardMaterial(material: Material) {
  if (material instanceof MeshStandardMaterial) {
    return material.clone();
  }

  const fallback = new MeshStandardMaterial();
  const maybeColor = material as Material & { color?: Color };
  if (maybeColor.color) {
    fallback.color.copy(maybeColor.color);
  }
  fallback.name = material.name;
  return fallback;
}

function polishMaterial(material: MeshStandardMaterial, accentColor: Color, visorMaterials: MeshStandardMaterial[], techMaterials: MeshStandardMaterial[]) {
  const role = getMaterialRole(material.name);

  material.flatShading = true;

  if (role === "visor") {
    material.color.set("#071827");
    material.emissive.set("#153447");
    material.emissiveIntensity = 0.18;
    material.roughness = 0.08;
    material.metalness = 0.32;
    material.transparent = true;
    material.opacity = 0.94;
    visorMaterials.push(material);
  } else if (role === "tech") {
    material.emissive.copy(accentColor);
    material.emissiveIntensity = 0.3;
    material.roughness = 0.28;
    material.metalness = 0.18;
    techMaterials.push(material);
  } else if (role === "helmet") {
    material.roughness = 0.5;
    material.metalness = 0.08;
  } else if (role === "suit") {
    material.roughness = 0.84;
    material.metalness = 0.04;
  } else if (role === "accessory" || role === "backpack") {
    material.roughness = 0.62;
    material.metalness = 0.14;
  } else {
    material.roughness = Math.max(material.roughness ?? 0.7, 0.48);
    material.metalness = Math.min(material.metalness ?? 0.08, 0.28);
  }

  material.needsUpdate = true;
}

function prepareScene(scene: Object3D, accentColor: string): PreparedScene {
  const cloned = clone(scene);
  const visorMaterials: MeshStandardMaterial[] = [];
  const techMaterials: MeshStandardMaterial[] = [];
  const accent = new Color(accentColor);

  cloned.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const polishedMaterials = sourceMaterials.map((sourceMaterial) => {
      const standardMaterial = toStandardMaterial(sourceMaterial);
      polishMaterial(standardMaterial, accent, visorMaterials, techMaterials);
      return standardMaterial;
    });

    child.material = polishedMaterials.length === 1 ? polishedMaterials[0] : polishedMaterials;
  });

  return { scene: cloned, visorMaterials, techMaterials };
}

function getAnimationBlend(animationState: GLBCharacterAnimationState) {
  if (animationState === "actionTriggered" || animationState === "completed") {
    return 1;
  }
  if (animationState === "interacting" || animationState === "highlighted") {
    return 0.72;
  }
  if (animationState === "walking") {
    return 0.46;
  }
  if (animationState === "falling") {
    return 0.18;
  }
  return 0.22;
}

function GLBCharacterContent({
  assetPath,
  scale = 1,
  positionOffset = [0, 0, 0],
  rotationOffset = [0, 0, 0],
  name,
  accentColor,
  animationState = "idle",
  onSceneReady,
  onAnimationsReady
}: Omit<GLBCharacterProps, "fallbackType" | "fallbackLabel">) {
  const gltf = useGLTF(assetPath);
  const prepared = useMemo(() => prepareScene(gltf.scene, accentColor), [accentColor, gltf.scene]);
  // Drive the AnimationMixer against the cloned scene root so each character
  // instance has its own mixer/actions and clips play independently.
  const animationRootRef = useRef<Group>(null);
  const { actions, mixer } = useAnimations(gltf.animations, animationRootRef);

  useEffect(() => {
    if (!inspectedAssets.has(assetPath)) {
      inspectedAssets.add(assetPath);
      debugGLBHierarchy(gltf.scene);
    }
  }, [assetPath, gltf.scene]);

  useEffect(() => {
    onSceneReady?.(prepared.scene);
  }, [onSceneReady, prepared.scene]);

  useEffect(() => {
    if (!onAnimationsReady) {
      return;
    }
    onAnimationsReady(actions as GLBActionMap, mixer);
  }, [actions, mixer, onAnimationsReady]);

  useEffect(() => {
    const animationBlend = getAnimationBlend(animationState);

    prepared.visorMaterials.forEach((material) => {
      material.emissiveIntensity = 0.08 + animationBlend * 0.22;
    });

    prepared.techMaterials.forEach((material) => {
      material.emissiveIntensity = 0.18 + animationBlend * 0.44;
    });
  }, [animationState, prepared]);

  return (
    <group name={name} scale={scale} position={positionOffset} rotation={rotationOffset}>
      <group ref={animationRootRef}>
        <primitive object={prepared.scene} />
      </group>
    </group>
  );
}

export function GLBCharacter({
  assetPath,
  scale,
  positionOffset,
  rotationOffset,
  name,
  accentColor,
  animationState = "idle",
  fallbackType,
  fallbackLabel,
  onSceneReady,
  onAnimationsReady
}: GLBCharacterProps) {
  return (
    <CharacterAssetErrorBoundary
      fallback={<FallbackCharacter type={fallbackType} accentColor={accentColor} label={fallbackLabel} />}
    >
      <Suspense fallback={<FallbackCharacter type={fallbackType} accentColor={accentColor} label={fallbackLabel} />}>
        <GLBCharacterContent
          assetPath={assetPath}
          scale={scale}
          positionOffset={positionOffset}
          rotationOffset={rotationOffset}
          name={name}
          accentColor={accentColor}
          animationState={animationState}
          onSceneReady={onSceneReady}
          onAnimationsReady={onAnimationsReady}
        />
      </Suspense>
    </CharacterAssetErrorBoundary>
  );
}
