import { useMemo } from "react";
import { resolveCharacterState } from "./CharacterInteractionState";
import type { MCPConfig } from "../npcs/mcpData";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { MCPNpcModel } from "./npcs/MCPNpcModel";
import { FloatingNameplate } from "../ui/FloatingNameplate";
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
      <MCPNpcModel
        npc={npc}
        index={index}
        highlighted={visualState === "highlighted" || visualState === "interacting" || visualState === "completed"}
        interacting={visualState === "interacting"}
        completed={visualState === "completed"}
        pulseVersion={pulseVersion}
        playerPosition={playerPosition}
      />
      <FloatingNameplate
        position={[npc.position.x, 2.55, npc.position.z]}
        title={npc.name}
        subtitle={npc.zoneName}
        accentColor={npc.color}
        highlighted={highlighted}
      />
      <InteractionRadius
        position={[npc.position.x, 0, npc.position.z]}
        visible={highlighted}
        interactive={nearbyNpcId === npc.id && !isDialogOpen}
      />
    </>
  );
}
