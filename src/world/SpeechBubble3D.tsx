import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

interface SpeechBubble3DProps {
  position: [number, number, number];
  text: string;
  /** Cor da borda (geralmente o accent do NPC). */
  accentColor: string;
}

/**
 * Balão de fala 3D em estilo "comic" — sempre virado para a câmera.
 * Usado para sinalizar uma pergunta/missão pendente acima de um NPC.
 *
 * Animação leve (bobbing) chama atenção sem competir com o resto do mundo.
 */
export function SpeechBubble3D({ position, text, accentColor }: SpeechBubble3DProps) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t * 1.4) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard follow>
        {/* Sombra/borda */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.7, 0.62]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        {/* Corpo do balão */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.62, 0.54]} />
          <meshBasicMaterial color="#fdf8ec" transparent opacity={0.95} depthWrite={false} />
        </mesh>
        {/* Texto */}
        <Text
          position={[0, 0.02, 0.01]}
          fontSize={0.14}
          color="#1d2b3e"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.5}
          textAlign="center"
          font={undefined}
        >
          {text}
        </Text>
        {/* Cauda apontando para baixo */}
        <mesh position={[-0.18, -0.36, 0]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.18, 0.18]} />
          <meshBasicMaterial color="#fdf8ec" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}
