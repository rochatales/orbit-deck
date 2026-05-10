import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type Mesh, MeshStandardMaterial } from "three";
import { useMeetingStore } from "../state/useMeetingStore";

interface MeetingBeaconProps {
  position: [number, number, number];
}

const ACTIVE_COLOR = "#4DD393";
const INACTIVE_COLOR = "#F5FBFF";
const ACTIVE_EMISSIVE = 0.85;
const INACTIVE_EMISSIVE = 0.32;

/**
 * Reuses the decor-node aesthetic (cylinder base + box column + sphere head)
 * but lives as a standalone interactive prop. The sphere head shifts white -> green
 * and pulses gently while the meeting is on. State is read from useMeetingStore
 * so any code path can flip it.
 */
export function MeetingBeacon({ position }: MeetingBeaconProps) {
  const headRef = useRef<Mesh>(null);
  const isActive = useMeetingStore((state) => state.isMeetingActive);

  const headMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: INACTIVE_COLOR,
      emissive: new Color(INACTIVE_COLOR),
      emissiveIntensity: INACTIVE_EMISSIVE,
      roughness: 0.28,
      metalness: 0.14,
      flatShading: true
    });
  }, []);

  const targetColor = useMemo(() => new Color(), []);

  useFrame((state, delta) => {
    targetColor.set(isActive ? ACTIVE_COLOR : INACTIVE_COLOR);
    const lerpAmount = Math.min(1, delta * 6);
    headMaterial.color.lerp(targetColor, lerpAmount);
    headMaterial.emissive.lerp(targetColor, lerpAmount);
    headMaterial.emissiveIntensity =
      headMaterial.emissiveIntensity +
      ((isActive ? ACTIVE_EMISSIVE : INACTIVE_EMISSIVE) - headMaterial.emissiveIntensity) * lerpAmount;

    if (headRef.current) {
      const t = state.clock.elapsedTime;
      const pulse = isActive ? Math.sin(t * 2.8) * 0.05 : 0;
      headRef.current.scale.setScalar(1 + pulse);
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.28, 8]} />
        <meshStandardMaterial color="#e6ddd0" roughness={0.84} metalness={0.04} flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.18, 0.42, 0.18]} />
        <meshStandardMaterial color="#dbe4ef" roughness={0.48} metalness={0.22} flatShading />
      </mesh>
      <mesh ref={headRef} position={[0, 0.78, 0]} castShadow material={headMaterial}>
        <sphereGeometry args={[0.14, 16, 16]} />
      </mesh>
    </group>
  );
}
