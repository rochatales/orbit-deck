import { Html } from "@react-three/drei";

interface InteractionRadiusProps {
  position: [number, number, number];
  visible: boolean;
  interactive: boolean;
}

export function InteractionRadius({ position, visible, interactive }: InteractionRadiusProps) {
  if (!visible) {
    return null;
  }

  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.8, 0.92, 40]} />
        <meshStandardMaterial color="#bfefff" transparent opacity={0.32} />
      </mesh>
      {interactive ? (
        <Html center position={[0, 2.15, 0]} distanceFactor={10} zIndexRange={[10, 0]}>
          <div className="world-prompt" aria-hidden="true">
            Press E to interact
          </div>
        </Html>
      ) : null}
    </group>
  );
}
