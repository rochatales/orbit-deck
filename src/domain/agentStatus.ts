/**
 * Estados de runtime de um agente.
 *
 * Os estados são derivados (não persistidos): combinam profile, deck selecionado,
 * conexões autorizadas e ações em execução para responder à pergunta
 * "este agente está disponível agora?".
 *
 * Prioridade de derivação (mais alta primeiro):
 *   1. demo                — sem profile, sem deck, ou NPC fora do deck atual
 *   2. busy                — está executando uma missão neste momento
 *   3. offline             — alguma ferramenta obrigatória está em denied/error
 *   4. error               — última missão registrou erro (transitório)
 *   5. waiting_connection  — ainda faltam ferramentas obrigatórias para conectar
 *   6. active              — tudo pronto
 */
export type AgentRuntimeState =
  | "demo"
  | "waiting_connection"
  | "offline"
  | "active"
  | "busy"
  | "error";

export interface AgentRuntimeInfo {
  state: AgentRuntimeState;
  /** Frase curta explicando por que o agente está nesse estado. */
  reason: string;
}

export interface AgentStateMeta {
  /** Label uppercase exibido em badges. */
  label: string;
  /** Cor de destaque (CSS) para o estado. */
  color: string;
  /** Descrição genérica do estado, para tooltips. */
  description: string;
}

export const AGENT_STATE_META: Record<AgentRuntimeState, AgentStateMeta> = {
  demo: {
    label: "Inativo",
    color: "#94a3b8",
    description: "Disponível em outros decks. Não está vinculado ao modo atual."
  },
  waiting_connection: {
    label: "Aguardando conexão",
    color: "#e6a936",
    description: "Faltam ferramentas obrigatórias para liberar este agente."
  },
  offline: {
    label: "Offline",
    color: "#b14d48",
    description: "Uma ferramenta obrigatória teve a autorização negada ou falhou."
  },
  active: {
    label: "Ativo",
    color: "#27ae60",
    description: "Pronto para receber missões."
  },
  busy: {
    label: "Ocupado",
    color: "#2f80ed",
    description: "Executando uma missão agora."
  },
  error: {
    label: "Erro",
    color: "#b14d48",
    description: "A última missão falhou."
  }
};

export function getAgentStateMeta(state: AgentRuntimeState): AgentStateMeta {
  return AGENT_STATE_META[state];
}
