import { Text } from "@react-three/drei";
import { useMemo } from "react";
import { Group, MeshStandardMaterial } from "three";
import { PLAYER_COLORS } from "../player/playerConfig";
import { createPlayerMaterials } from "../player/playerMaterials";
import { createMCPCharacter } from "../createMCPCharacter";
import type { CharacterFallbackType } from "../characterAssetConfig";

interface FallbackCharacterProps {
  type: CharacterFallbackType;
  accentColor: string;
  label?: string;
}

function FallbackLabel({ accentColor, label = "Fallback GLB" }: { accentColor: string; label?: string }) {
  return (
    <group position={[0, 2.12, 0]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.74, 0.18]} />
        <meshStandardMaterial color="#122032" transparent opacity={0.92} />
      </mesh>
      <Text
        color={accentColor}
        fontSize={0.08}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#08111b"
      >
        {label}
      </Text>
    </group>
  );
}

function PlayerFallbackBody() {
  const materials = useMemo(() => createPlayerMaterials(), []);

  return (
    <group position={[0, 0.02, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} material={materials.shadow} scale={[1.16, 1, 0.92]}>
        <circleGeometry args={[0.34, 20]} />
      </mesh>

      <group position={[-0.14, 0.09, 0.03]}>
        <mesh castShadow material={materials.boots}>
          <boxGeometry args={[0.24, 0.16, 0.3]} />
        </mesh>
        <mesh castShadow position={[0, 0.09, -0.01]} material={materials.boots}>
          <boxGeometry args={[0.2, 0.06, 0.24]} />
        </mesh>
      </group>

      <group position={[0.14, 0.09, 0.03]}>
        <mesh castShadow material={materials.boots}>
          <boxGeometry args={[0.24, 0.16, 0.3]} />
        </mesh>
        <mesh castShadow position={[0, 0.09, -0.01]} material={materials.boots}>
          <boxGeometry args={[0.2, 0.06, 0.24]} />
        </mesh>
      </group>

      <mesh castShadow position={[-0.14, 0.32, 0]} material={materials.suitShadow}>
        <boxGeometry args={[0.18, 0.3, 0.18]} />
      </mesh>
      <mesh castShadow position={[0.14, 0.32, 0]} material={materials.suitShadow}>
        <boxGeometry args={[0.18, 0.3, 0.18]} />
      </mesh>

      <group position={[0, 0.06, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.58, 0]} material={materials.suit}>
          <cylinderGeometry args={[0.23, 0.29, 0.54, 7]} />
        </mesh>
        <mesh castShadow position={[0, 0.8, -0.03]} material={materials.suit}>
          <boxGeometry args={[0.4, 0.14, 0.28]} />
        </mesh>
        <mesh castShadow position={[0, 0.44, 0]} material={materials.suitShadow}>
          <boxGeometry args={[0.44, 0.14, 0.26]} />
        </mesh>

        <group position={[0, 0.67, 0.19]}>
          <mesh castShadow material={materials.techFrame}>
            <boxGeometry args={[0.22, 0.16, 0.06]} />
          </mesh>
          <mesh position={[-0.05, 0.02, 0.034]} material={materials.techGlow}>
            <boxGeometry args={[0.06, 0.05, 0.01]} />
          </mesh>
          <mesh position={[0.05, 0.02, 0.034]} material={materials.techGlow}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
          </mesh>
          <mesh position={[0.01, -0.04, 0.034]} material={materials.visor}>
            <boxGeometry args={[0.05, 0.04, 0.01]} />
          </mesh>
        </group>

        <group position={[-0.28, 0.73, 0.02]} rotation={[0, 0, 0.28]}>
          <mesh castShadow position={[0, -0.16, 0]} material={materials.suit}>
            <boxGeometry args={[0.13, 0.34, 0.14]} />
          </mesh>
          <mesh castShadow position={[0.02, -0.39, 0]} material={materials.gloves}>
            <boxGeometry args={[0.16, 0.12, 0.16]} />
          </mesh>
          <mesh castShadow position={[0.1, -0.5, 0.14]} material={materials.utility}>
            <boxGeometry args={[0.16, 0.18, 0.1]} />
          </mesh>
        </group>

        <group position={[0.28, 0.73, 0.02]} rotation={[0, 0, -0.28]}>
          <mesh castShadow position={[0, -0.16, 0]} material={materials.suit}>
            <boxGeometry args={[0.13, 0.34, 0.14]} />
          </mesh>
          <mesh castShadow position={[-0.02, -0.39, 0]} material={materials.gloves}>
            <boxGeometry args={[0.16, 0.12, 0.16]} />
          </mesh>
        </group>
      </group>

      <group position={[0, 0.76, -0.2]}>
        <mesh castShadow material={materials.backpack}>
          <boxGeometry args={[0.28, 0.4, 0.16]} />
        </mesh>
        <mesh castShadow position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.utility}>
          <cylinderGeometry args={[0.07, 0.07, 0.24, 8]} />
        </mesh>
      </group>

      <group position={[0, 1.04, 0.03]}>
        <mesh castShadow material={materials.helmet} scale={[1.05, 0.98, 1.02]}>
          <icosahedronGeometry args={[0.42, 1]} />
        </mesh>
        <mesh castShadow position={[0, -0.03, 0.02]} material={materials.helmetShadow} scale={[1.02, 0.38, 0.92]}>
          <cylinderGeometry args={[0.34, 0.38, 0.12, 10]} />
        </mesh>
        <mesh castShadow position={[0, -0.02, 0.18]} material={materials.visor} scale={[1.02, 0.82, 0.62]}>
          <sphereGeometry args={[0.31, 10, 8, 0.58, 2, 0.48, 1.52]} />
        </mesh>
      </group>
    </group>
  );
}

function NpcFallbackBody({ type, accentColor }: { type: Exclude<CharacterFallbackType, "player">; accentColor: string }) {
  const character = useMemo(() => createMCPCharacter(type, accentColor), [accentColor, type]);
  const root = useMemo(() => {
    const cloned = character.root.clone(true) as Group;
    cloned.traverse((child) => {
      if ("material" in child) {
        const mesh = child as { material?: MeshStandardMaterial | MeshStandardMaterial[]; castShadow?: boolean; receiveShadow?: boolean };
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((material) => material.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [character]);

  return <primitive object={root} position={[0, 0.12, 0]} />;
}

export function FallbackCharacter({ type, accentColor, label }: FallbackCharacterProps) {
  const fallbackLabel = label ?? (type === "player" ? "Player Fallback" : "NPC Fallback");

  if (type === "player") {
    return (
      <group>
        <PlayerFallbackBody />
        <FallbackLabel accentColor={PLAYER_COLORS.techAccent} label={fallbackLabel} />
      </group>
    );
  }

  return (
    <group>
      <NpcFallbackBody type={type} accentColor={accentColor} />
      <FallbackLabel accentColor={accentColor} label={fallbackLabel} />
    </group>
  );
}
