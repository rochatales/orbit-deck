import { useMemo } from "react";
import { resolveCharacterState } from "./CharacterInteractionState";
import type { MCPConfig } from "../npcs/mcpData";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { useAgentStatus } from "../state/useAgentStatus";
import { useClientSetupStore } from "../state/useClientSetupStore";
import { MCPNpcModel } from "./npcs/MCPNpcModel";
import { FloatingNameplate } from "../ui/FloatingNameplate";
import { AgentStatusBillboard } from "../world/AgentStatusBillboard";
import { SpeechBubble3D } from "../world/SpeechBubble3D";
import { InteractionRadius } from "../interactions/InteractionRadius";

interface MCPCharacterProps {
  npc: MCPConfig;
  index: number;
}

export function MCPCharacter({ npc, index }: MCPCharacterProps) {
  const nearbyNpcId = useGameStore((state) => state.nearbyNpcId);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const isDialogOpen = useDialogueStore((state) => state.isOpen);
  const runCompleted = useWorkflowStore((state) => state.runCompleted);
  const pulseVersion = useWorkflowStore((state) => state.npcPulseVersion[npc.id] ?? 0);

  const highlighted = nearbyNpcId === npc.id || activeNpcId === npc.id;
  const interacting = activeNpcId === npc.id;
  const completed = runCompleted && npc.id === "output-review";
  const agentStatus = useAgentStatus(npc.id);
  // Eden mostra um balão "Algum cliente novo?" enquanto o player não cadastrou
  // nenhum cliente — dispara a missão de onboarding.
  const showOnboardingBubble = useClientSetupStore(
    (state) => npc.id === "brand-brain" && state.customClients.length === 0
  );
  const visualState = useMemo(
    () =>
      resolveCharacterState({
        highlighted,
        interacting,
        actionTriggered: false,
        completed
      }),
    [completed, highlighted, interacting]
  );

  return (
    <>
      {!npc.isEnvironmentNode && (
        <MCPNpcModel
          npc={npc}
          index={index}
          highlighted={visualState === "highlighted" || visualState === "interacting" || visualState === "completed"}
          interacting={visualState === "interacting"}
          completed={visualState === "completed"}
          pulseVersion={pulseVersion}
          playerPosition={playerPosition}
        />
      )}
      <FloatingNameplate
        position={[npc.position.x, 2.55, npc.position.z]}
        title={npc.name}
        subtitle={npc.zoneName}
        accentColor={npc.color}
        highlighted={highlighted}
      />
      <AgentStatusBillboard
        position={[npc.position.x, 3.18, npc.position.z]}
        info={agentStatus}
        highlighted={highlighted}
      />
      {showOnboardingBubble ? (
        <SpeechBubble3D
          position={[npc.position.x, 3.85, npc.position.z]}
          text="Algum cliente novo?"
          accentColor={npc.color}
        />
      ) : null}
      <InteractionRadius
        position={[npc.position.x, 0, npc.position.z]}
        visible={highlighted}
        interactive={nearbyNpcId === npc.id && !isDialogOpen}
      />
    </>
  );
}
