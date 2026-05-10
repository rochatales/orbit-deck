import { Billboard, Text } from "@react-three/drei";

interface FloatingNameplateProps {
  position: [number, number, number];
  title: string;
  subtitle: string;
  accentColor: string;
  highlighted: boolean;
}

export function FloatingNameplate({
  position,
  title,
  subtitle,
  accentColor,
  highlighted
}: FloatingNameplateProps) {
  return (
    <Billboard position={position} follow>
      <mesh position={[0, 0, -0.01]} scale={highlighted ? 1.06 : 1}>
        <planeGeometry args={[1.8, 0.52]} />
        <meshBasicMaterial color="#101723" transparent opacity={highlighted ? 0.52 : 0.36} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <planeGeometry args={[1.3, 0.02]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.82} depthWrite={false} />
      </mesh>
      <Text position={[0, 0.06, 0.01]} fontSize={0.16} maxWidth={1.6} color="#f8fbff" anchorX="center" anchorY="middle" font={undefined} letterSpacing={0.08}>
        {title.toUpperCase()}
      </Text>
      <Text position={[0, -0.12, 0.01]} fontSize={0.048} maxWidth={1.4} color="#c9d2df" anchorX="center" anchorY="middle">
        {subtitle.toUpperCase()}
      </Text>
    </Billboard>
  );
}
