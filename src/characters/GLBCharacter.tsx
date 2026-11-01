import { useSimulationBlocked } from "../game/simulationGate";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Group, type AnimationAction, type AnimationMixer, type Object3D } from "three";
import { prepareScene } from "./prepareCharacterScene";
import { debugGLBHierarchy } from "./debugGLBHierarchy";
import { FallbackCharacter } from "./fallback/FallbackCharacter";
import type { CharacterFallbackType } from "./characterAssetConfig";

export type GLBCharacterAnimationState =
  | "idle"
  | "walking"
  | "interacting"
  | "actionTriggered"
  | "falling"
  | "backward"
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
  /** Ver `CharacterAssetConfig.materialProfile`; padrão 'estilizado' (comportamento anterior). */
  materialProfile?: "estilizado" | "preservar";
  onSceneReady?: (scene: Object3D) => void;
  onAnimationsReady?: (actions: GLBActionMap, mixer: AnimationMixer) => void;
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

function getAnimationBlend(animationState: GLBCharacterAnimationState) {
  if (animationState === "actionTriggered" || animationState === "completed") {
    return 1;
  }
  if (animationState === "interacting" || animationState === "highlighted") {
    return 0.72;
  }
  if (animationState === "walking" || animationState === "backward") {
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
  materialProfile = "estilizado",
  onSceneReady,
  onAnimationsReady
}: Omit<GLBCharacterProps, "fallbackType" | "fallbackLabel">) {
  const gltf = useGLTF(assetPath);
  const prepared = useMemo(() => prepareScene(gltf.scene, accentColor, materialProfile), [accentColor, gltf.scene, materialProfile]);
  // Só os materiais criados por este personagem; acessórios anexados depois possuem outro ciclo.
  useEffect(() => () => {
    prepared.materials.forEach(material => material.dispose());
  }, [prepared]);
  // Drive the AnimationMixer against the cloned scene root so each character
  // instance has its own mixer/actions and clips play independently.
  const animationRootRef = useRef<Group>(null);
  const { actions, mixer } = useAnimations(gltf.animations, animationRootRef);
  const paused = useSimulationBlocked();
  useEffect(() => { mixer.timeScale = paused ? 0 : 1; }, [mixer, paused]);

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
  materialProfile,
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
          materialProfile={materialProfile}
          onSceneReady={onSceneReady}
          onAnimationsReady={onAnimationsReady}
        />
      </Suspense>
    </CharacterAssetErrorBoundary>
  );
}
