import type { NpcId } from "./mcpActions";

/**
 * Estrutura de Decks
 *
 * Os decks são a camada de produto acima do escritório 3D. Cada deck representa
 * um modo de trabalho que o player escolhe ANTES de cair no mundo.
 *
 * Cada deck declara:
 * - identidade visual (cor, ícone)
 * - mensagem de boas-vindas
 * - quais ferramentas (MCPs/conectores) são necessárias antes de ativar agentes
 * - qual NPC do escritório atual hospeda o deck (para reaproveitar a cena 3D)
 */

export type DeckId =
  | "brand-brain"
  | "editorial"
  | "design"
  | "narration"
  | "social-media";

export type ToolId =
  | "google-drive"
  | "google-docs"
  | "calendar"
  | "notion"
  | "local-folder";

/**
 * Identificador do ícone do deck.
 *
 * Mantido como string (não como `LucideIcon`) para preservar `domain/`
 * livre de dependências de React/UI. A camada `journey/` resolve
 * o ícone real via `deckIcons.ts`.
 */
export type DeckIconId = "brain" | "newspaper" | "palette" | "mic" | "megaphone";

export interface DeckTool {
  id: ToolId;
  label: string;
  /** Descrição genérica da ferramenta (vem do catálogo `TOOL_LABELS`). */
  description: string;
  required: boolean;
  /**
   * Por que ESTE deck precisa desta ferramenta.
   * Mostrado na tela de conexão para deixar claro o motivo da autorização.
   */
  purpose: string;
}

export interface DeckDefinition {
  id: DeckId;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  iconId: DeckIconId;
  /** NPC do escritório atual responsável pelo deck (reusa cena 3D existente). */
  primaryNpcId: NpcId;
  /** Decks adjacentes (NPCs aliados que podem ser visitados a partir deste deck). */
  alliedNpcIds: NpcId[];
  tools: DeckTool[];
  /**
   * Entregas principais do deck — o que o player pode esperar
   * produzir uma vez que tudo estiver conectado.
   */
  outcomes: string[];
  /** Mostrado como mensagem inicial na tela de seleção. */
  welcomeMessage: string;
}

/** Lista de NPCs envolvidos no deck (principal + aliados), em ordem de prioridade. */
export function getDeckAgentIds(deck: DeckDefinition): NpcId[] {
  return [deck.primaryNpcId, ...deck.alliedNpcIds.filter((id) => id !== deck.primaryNpcId)];
}

const TOOL_LABELS: Record<ToolId, { label: string; description: string }> = {
  "google-drive": {
    label: "Google Drive",
    description: "Acesso aos arquivos de marca, briefings e exports."
  },
  "google-docs": {
    label: "Google Docs",
    description: "Documentos editoriais e briefings colaborativos."
  },
  calendar: {
    label: "Google Calendar",
    description: "Calendário editorial e janelas de publicação."
  },
  notion: {
    label: "Notion",
    description: "Bases de marca, runbooks e bancos de ideias."
  },
  "local-folder": {
    label: "Pasta Local",
    description: "Pastas do cliente já mapeadas pelo sistema editorial."
  }
};

function tool(
  id: ToolId,
  options: { purpose: string; required?: boolean }
): DeckTool {
  return {
    id,
    label: TOOL_LABELS[id].label,
    description: TOOL_LABELS[id].description,
    required: options.required ?? true,
    purpose: options.purpose
  };
}

export const DECK_REGISTRY: Record<DeckId, DeckDefinition> = {
  "brand-brain": {
    id: "brand-brain",
    name: "Brand Brain Deck",
    tagline: "A fonte única de verdade da marca.",
    description:
      "Centraliza regras de marca, tom de voz, restrições visuais e ativos canônicos para todos os outros decks consumirem.",
    accentColor: "#F2C94C",
    iconId: "brain",
    primaryNpcId: "brand-brain",
    alliedNpcIds: ["editorial", "design"],
    tools: [
      tool("google-drive", {
        purpose: "Ler os arquivos canônicos da marca (logos, templates, paletas)."
      }),
      tool("notion", {
        purpose: "Bases de tom de voz, runbooks e bancos de ideias."
      }),
      tool("local-folder", {
        purpose: "Pastas de cliente já mapeadas pelo sistema editorial."
      })
    ],
    outcomes: [
      "Regras canônicas por cliente",
      "Tokens visuais e de voz",
      "Validação de conformidade de marca"
    ],
    welcomeMessage:
      "Você entrou no Brand Brain. Conecte as fontes oficiais para que todos os decks possam falar com a mesma voz."
  },
  editorial: {
    id: "editorial",
    name: "Editorial Deck",
    tagline: "Ideação, briefings e calendário de conteúdo.",
    description:
      "Transforma estratégia em pautas, briefings, hooks e calendários editoriais prontos para os outros decks.",
    accentColor: "#2F80ED",
    iconId: "newspaper",
    primaryNpcId: "editorial",
    alliedNpcIds: ["brand-brain", "design", "output-review"],
    tools: [
      tool("google-drive", {
        purpose: "Salvar briefings, anexos e exports editoriais."
      }),
      tool("google-docs", {
        purpose: "Editar pautas, hooks e legendas em documentos colaborativos."
      }),
      tool("calendar", {
        purpose: "Montar e revisar o calendário editorial multicliente."
      }),
      tool("local-folder", {
        purpose: "Ler insumos editoriais já organizados por cliente."
      })
    ],
    outcomes: [
      "Briefings editoriais estruturados",
      "Calendário editorial multicliente",
      "Hooks, legendas e textos de carrossel"
    ],
    welcomeMessage:
      "Você entrou no Editorial Deck. Conecte Drive, Docs e Calendário para liberar o pipeline de briefings."
  },
  design: {
    id: "design",
    name: "Design Deck",
    tagline: "Direção visual, layouts e prompts de imagem.",
    description:
      "Recebe briefings editoriais e gera direções visuais, prompts de imagem e layouts de carrossel prontos.",
    accentColor: "#27AE60",
    iconId: "palette",
    primaryNpcId: "design",
    alliedNpcIds: ["brand-brain", "editorial", "output-review"],
    tools: [
      tool("google-drive", {
        purpose: "Ler assets visuais e salvar layouts gerados."
      }),
      tool("local-folder", {
        purpose: "Selecionar fotos das pastas locais por cliente."
      })
    ],
    outcomes: [
      "Prompts de imagem alinhados à marca",
      "Layouts de carrossel prontos",
      "Seleção de fotos por pasta de cliente"
    ],
    welcomeMessage:
      "Você entrou no Design Deck. Conecte os repositórios de assets para liberar prompts e layouts."
  },
  narration: {
    id: "narration",
    name: "Narration Deck",
    tagline: "Roteiros de voz e prompts de áudio.",
    description:
      "Converte roteiros aprovados em textos de narração, prompts de voz e pacotes prontos para áudio.",
    accentColor: "#9B51E0",
    iconId: "mic",
    primaryNpcId: "narration",
    alliedNpcIds: ["editorial", "output-review"],
    tools: [
      tool("google-drive", {
        purpose: "Ler roteiros aprovados e salvar prompts de voz."
      }),
      tool("local-folder", {
        purpose: "Acessar referências de voz e packs de áudio do cliente."
      })
    ],
    outcomes: [
      "Texto de narração limpo",
      "Prompts de voz por cliente",
      "Pacotes prontos para o pipeline de áudio"
    ],
    welcomeMessage:
      "Você entrou no Narration Deck. Conecte as fontes de roteiro para liberar prompts de voz."
  },
  "social-media": {
    id: "social-media",
    name: "Social Media Deck",
    tagline: "Revisão final, aprovação e calendário de publicação.",
    description:
      "Revisa pacotes prontos, aprova conteúdo final e organiza a fila de publicação no calendário.",
    accentColor: "#00C2FF",
    iconId: "megaphone",
    // O NPC ASTRA usa o asset social-media e fica na zona de Output/Review.
    primaryNpcId: "output-review",
    alliedNpcIds: ["editorial", "design", "narration"],
    tools: [
      tool("google-drive", {
        purpose: "Buscar pacotes finais e arquivar versões aprovadas."
      }),
      tool("notion", {
        purpose: "Atualizar status de revisão e publicação por cliente."
      }),
      tool("calendar", {
        purpose: "Organizar a fila e os horários de publicação."
      })
    ],
    outcomes: [
      "Pacote final aprovado",
      "Fila de publicação organizada",
      "Exportação pronta para entrega"
    ],
    welcomeMessage:
      "Você entrou no Social Media Deck. Conecte Drive, Notion e Calendário para liberar a fila de publicação."
  }
};

export const DECK_LIST: DeckDefinition[] = [
  DECK_REGISTRY["brand-brain"],
  DECK_REGISTRY.editorial,
  DECK_REGISTRY.design,
  DECK_REGISTRY.narration,
  DECK_REGISTRY["social-media"]
];

export function getDeck(id: DeckId): DeckDefinition {
  return DECK_REGISTRY[id];
}

export function getDeckSafe(id: DeckId | null | undefined): DeckDefinition | null {
  if (!id) return null;
  return DECK_REGISTRY[id] ?? null;
}
