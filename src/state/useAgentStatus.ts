import { useMemo } from "react";
import {
  AGENT_STATE_META,
  type AgentRuntimeInfo,
  type AgentRuntimeState
} from "../domain/agentStatus";
import {
  DECK_REGISTRY,
  getAgentHomeDeckId,
  type DeckId
} from "../domain/decks";
import type { NpcId } from "../domain/mcpActions";
import {
  usePlayerJourneyStore,
  type DeckConnectionMap,
  type PlayerProfile
} from "./usePlayerJourneyStore";
import { useWorkflowStore, type WorkflowNotification } from "./useWorkflowStore";

interface DeriveInput {
  npcId: NpcId;
  profile: PlayerProfile | null;
  activatedDeckIds: DeckId[];
  connections: DeckConnectionMap;
  activeActionKeys: string[];
  notifications: WorkflowNotification[];
}

/**
 * Função pura de derivação. Mantida exportada para testes e para evitar
 * acoplar a lógica ao ciclo de vida do React.
 *
 * Agora cada NPC é avaliado com base no SEU deck-home (o deck onde ele é
 * agente principal). Se esse deck não foi adicionado à estação, o agente
 * fica em `demo`.
 */
export function deriveAgentStatus(input: DeriveInput): AgentRuntimeInfo {
  const { npcId, profile, activatedDeckIds, connections, activeActionKeys, notifications } = input;

  if (!profile) {
    return { state: "demo", reason: "Faça login para ativar agentes." };
  }

  const homeDeckId = getAgentHomeDeckId(npcId);
  if (!homeDeckId) {
    // Defensivo: NPC sem deck-home não tem status de runtime.
    return { state: "demo", reason: "Agente fora do mapa de decks." };
  }

  // 1. Deck do agente não está ativo na estação → demo.
  if (!activatedDeckIds.includes(homeDeckId)) {
    const homeDeck = DECK_REGISTRY[homeDeckId];
    return {
      state: "demo",
      reason: `Adicione o ${homeDeck.name} à estação para ativar este agente.`
    };
  }

  // 2. Está executando uma missão? → busy
  const isBusy = activeActionKeys.some((key) => key.startsWith(`${npcId}:`));
  if (isBusy) {
    return { state: "busy", reason: "Executando uma missão neste deck." };
  }

  // 3. Ferramenta obrigatória do deck-home com denied/error → offline
  const deck = DECK_REGISTRY[homeDeckId];
  const deckConnections = connections[homeDeckId] ?? {};
  const requiredTools = deck.tools.filter((t) => t.required);
  const failedTool = requiredTools.find((t) => {
    const status = deckConnections[t.id];
    return status === "denied" || status === "error";
  });
  if (failedTool) {
    return {
      state: "offline",
      reason: `Sem acesso a ${failedTool.label}. Reautorize para reativar o agente.`
    };
  }

  // 4. Notificação recente do NPC marcou erro → error
  const recentError = notifications.find(
    (n) => n.npcId === npcId && n.phase === "error"
  );
  if (recentError) {
    return {
      state: "error",
      reason: `Última missão falhou: ${recentError.title}.`
    };
  }

  // 5. Faltam ferramentas obrigatórias → waiting_connection
  const missing = requiredTools.filter((t) => deckConnections[t.id] !== "connected");
  if (missing.length > 0) {
    const first = missing[0];
    const extra = missing.length > 1 ? ` e mais ${missing.length - 1}` : "";
    return {
      state: "waiting_connection",
      reason: `Aguardando autorização de ${first.label}${extra}.`
    };
  }

  // 6. Caso contrário → active
  return { state: "active", reason: "Pronto. O agente pode receber missões." };
}

/**
 * Hook React que combina os stores relevantes e devolve o estado derivado
 * para um NPC específico.
 */
export function useAgentStatus(npcId: NpcId): AgentRuntimeInfo {
  const profile = usePlayerJourneyStore((s) => s.profile);
  const activatedDeckIds = usePlayerJourneyStore((s) => s.activatedDeckIds);
  const connections = usePlayerJourneyStore((s) => s.connections);
  const activeActionKeys = useWorkflowStore((s) => s.activeActionKeys);
  const notifications = useWorkflowStore((s) => s.notifications);

  return useMemo(
    () =>
      deriveAgentStatus({
        npcId,
        profile,
        activatedDeckIds,
        connections,
        activeActionKeys,
        notifications
      }),
    [npcId, profile, activatedDeckIds, connections, activeActionKeys, notifications]
  );
}

export { AGENT_STATE_META };
export type { AgentRuntimeInfo, AgentRuntimeState };
