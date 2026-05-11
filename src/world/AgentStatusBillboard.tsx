import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import {
  AGENT_STATE_META,
  type AgentRuntimeInfo
} from "../domain/agentStatus";

interface AgentStatusBillboardProps {
  position: [number, number, number];
  info: AgentRuntimeInfo;
  /**
   * Quando o player está próximo, o painel "respira" um pouco para
   * chamar atenção ao motivo da disponibilidade do agente.
   */
  highlighted: boolean;
}

const PANEL_WIDTH = 1.9;
const PANEL_HEIGHT = 0.5;

/**
 * Painel 3D, em billboard, mostrando o estado de runtime do agente.
 *
 * Sempre virado para a câmera. Exibe:
 *  - barra de cor superior no tom do estado
 *  - bolinha + label do estado
 *  - frase curta com o motivo
 *
 * Estados `busy` e `error` ganham um pulso suave para destacar urgência.
 */
export function AgentStatusBillboard({
  position,
  info,
  highlighted
}: AgentStatusBillboardProps) {
  const meta = AGENT_STATE_META[info.state];
  const dotRef = useRef<Mesh>(null);
  const panelRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (dotRef.current) {
      // Pulso quando busy/error/highlighted; estados estáveis ficam parados.
      const wantsPulse = info.state === "busy" || info.state === "error" || highlighted;
      const target = wantsPulse ? 1 + Math.sin(t * 4.2) * 0.12 : 1;
      dotRef.current.scale.setScalar(target);
    }
    if (panelRef.current) {
      const focusOpacity = highlighted ? 0.9 : 0.78;
      const material = panelRef.current.material as { opacity?: number };
      if (material && typeof material.opacity === "number") {
        material.opacity = focusOpacity;
      }
    }
  });

  return (
    <Billboard position={position} follow>
      {/* Painel principal */}
      <mesh ref={panelRef} position={[0, 0, -0.01]}>
        <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
        <meshBasicMaterial color="#0a1628" transparent opacity={0.78} depthWrite={false} />
      </mesh>
      {/* Faixa de cor do estado, no topo */}
      <mesh position={[0, PANEL_HEIGHT / 2 - 0.03, 0]}>
        <planeGeometry args={[PANEL_WIDTH - 0.05, 0.04]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {/* Bolinha de estado à esquerda */}
      <mesh ref={dotRef} position={[-PANEL_WIDTH / 2 + 0.16, 0.06, 0.01]}>
        <circleGeometry args={[0.06, 24]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {/* Label uppercase do estado */}
      <Text
        position={[-PANEL_WIDTH / 2 + 0.28, 0.06, 0.02]}
        fontSize={0.1}
        color={meta.color}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.08}
        maxWidth={PANEL_WIDTH - 0.4}
      >
        {meta.label.toUpperCase()}
      </Text>
      {/* Motivo da disponibilidade */}
      <Text
        position={[-PANEL_WIDTH / 2 + 0.16, -0.12, 0.02]}
        fontSize={0.07}
        color="#cdd5e0"
        anchorX="left"
        anchorY="middle"
        maxWidth={PANEL_WIDTH - 0.32}
        lineHeight={1.15}
      >
        {info.reason}
      </Text>
    </Billboard>
  );
}
