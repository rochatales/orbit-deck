import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial, TorusGeometry, Vector3 } from "three";
import { GLBCharacter, type GLBActionMap } from "../GLBCharacter";
import { getNpcCharacterAssetConfig } from "../characterAssetConfig";
import type { MCPConfig } from "../../npcs/mcpData";
import { damp, dampAngle } from "../../utils/math";
import { NpcAnimationController } from "./NpcAnimationController";

interface MCPNpcModelProps {
  npc: MCPConfig;
  index: number;
  highlighted: boolean;
  interacting: boolean;
  completed: boolean;
  pulseVersion: number;
  playerPosition: { x: number; y: number; z: number };
}

export function MCPNpcModel({
  npc,
  index,
  highlighted,
  interacting,
  completed,
  pulseVersion,
  playerPosition
}: MCPNpcModelProps) {
  const config = getNpcCharacterAssetConfig(npc.id);
  const rootRef = useRef<Group>(null);
  const ringRef = useRef<Mesh<TorusGeometry, MeshStandardMaterial>>(null);
  const highlightBlend = useRef(0);
  const interactBlend = useRef(0);
  const completedBlend = useRef(0);
  const actionPulse = useRef(0);
  const baseAccent = useMemo(() => new Color(config.accentColor), [config.accentColor]);
  const successAccent = useMemo(() => new Color("#4DD393"), []);
  const phaseOffset = index * 0.75;
  const targetVector = useMemo(() => new Vector3(), []);
  const currentVector = useMemo(() => new Vector3(), []);
  // Animation actions populate after the GLB finishes loading. NPCs whose
  // GLBs haven't been re-baked through the Mixamo pipeline yet will simply
  // have an empty actions map and render statically.
  const [actions, setActions] = useState<GLBActionMap>({});

  useEffect(() => {
    if (pulseVersion > 0) {
      actionPulse.current = 1;
    }
  }, [pulseVersion]);

  useFrame((state, delta) => {
    highlightBlend.current = damp(highlightBlend.current, highlighted || interacting || completed ? 1 : 0, 9, delta);
    interactBlend.current = damp(interactBlend.current, interacting ? 1 : 0, 10, delta);
    completedBlend.current = damp(completedBlend.current, completed ? 1 : 0, 6, delta);
    actionPulse.current = damp(actionPulse.current, 0, 12, delta);

    const idleLift = Math.sin(state.clock.elapsedTime * 1.8 + phaseOffset) * 0.035;
    const activeLift = Math.sin(state.clock.elapsedTime * 3.4 + phaseOffset) * 0.02 * (0.35 + interactBlend.current);
    const scaleBoost = 1 + highlightBlend.current * 0.04 + actionPulse.current * 0.035;

    if (rootRef.current) {
      rootRef.current.position.set(npc.position.x, npc.position.y + idleLift + activeLift + actionPulse.current * 0.05, npc.position.z);
      rootRef.current.scale.setScalar(scaleBoost);

      if (interacting) {
        targetVector.set(playerPosition.x, 0, playerPosition.z);
        currentVector.set(rootRef.current.position.x, 0, rootRef.current.position.z);
        const targetRotation = Math.atan2(targetVector.x - currentVector.x, targetVector.z - currentVector.z);
        rootRef.current.rotation.y = dampAngle(rootRef.current.rotation.y, targetRotation, 8, delta);
      } else {
        rootRef.current.rotation.y = dampAngle(rootRef.current.rotation.y, config.rotationOffset[1], 7, delta);
      }
    }

    if (ringRef.current) {
      const ringScale = 1 + highlightBlend.current * 0.16 + actionPulse.current * 0.08 + completedBlend.current * 0.12;
      ringRef.current.scale.setScalar(ringScale);

      const ringAccent = baseAccent.clone().lerp(successAccent, completedBlend.current);
      ringRef.current.material.color.copy(ringAccent);
      ringRef.current.material.emissive.copy(ringAccent).multiplyScalar(
        0.16 + highlightBlend.current * 0.22 + completedBlend.current * 0.2
      );
      ringRef.current.material.opacity = MathUtils.lerp(0.9, 1, highlightBlend.current);
    }
  });

  const visualState = completed
    ? "completed"
    : interacting
      ? "interacting"
      : highlighted
        ? "highlighted"
        : "idle";

  return (
    <group ref={rootRef} position={[npc.position.x, npc.position.y, npc.position.z]} rotation={[0, config.rotationOffset[1], 0]}>
      <mesh
        ref={ringRef}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.06, 0]}
        receiveShadow
      >
        <torusGeometry args={[0.8, 0.08, 12, 40]} />
        <meshStandardMaterial
          color={config.accentColor}
          emissive={config.accentColor}
          emissiveIntensity={0.16}
          transparent
          opacity={0.9}
          roughness={0.35}
          metalness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.68, 0.76, 0.12, 18]} />
        <meshStandardMaterial color="#253249" roughness={0.65} metalness={0.15} flatShading />
      </mesh>
      <GLBCharacter
        assetPath={config.assetPath}
        scale={config.scale}
        positionOffset={config.positionOffset}
        rotationOffset={[0, 0, 0]}
        name={config.name}
        accentColor={config.accentColor}
        animationState={visualState}
        fallbackType={config.fallbackType}
        fallbackLabel={`${config.name} Fallback`}
        onAnimationsReady={(loadedActions) => {
          setActions(loadedActions);
        }}
      />
      <NpcAnimationController actions={actions} interacting={interacting} />
    </group>
  );
}
