export type NpcId = "brand-brain" | "editorial" | "narration" | "design" | "output-review";

export type ActionId =
  | "view-brand-rules"
  | "validate-brand-compliance"
  | "send-brand-tokens-to-editorial"
  | "send-visual-tokens-to-design"
  | "generate-editorial-brief"
  | "create-carousel-copy"
  | "create-caption"
  | "send-brief-to-design"
  | "send-script-to-narration"
  | "generate-narration-copy"
  | "select-voice-id"
  | "prepare-voice-prompt"
  | "send-audio-brief-to-output"
  | "generate-design-prompt"
  | "select-visual-style"
  | "assemble-carousel-layout"
  | "prepare-image-prompt"
  | "review-current-post"
  | "approve-content"
  | "export-package"
  | "mark-ready-to-publish";

export type WorkflowTaskId = "talk-brand-brain" | "generate-brief" | "send-to-design" | "review-output";

export interface NpcAction {
  id: ActionId;
  label: string;
}

interface ActionDefinition {
  label: string;
  shortLabel: string;
}

const ACTION_DEFINITIONS: Record<ActionId, ActionDefinition> = {
  "view-brand-rules": { label: "Ver Regras da Marca", shortLabel: "VER MARCA" },
  "validate-brand-compliance": { label: "Validar Conformidade da Marca", shortLabel: "VALIDAR" },
  "send-brand-tokens-to-editorial": { label: "Enviar Tokens de Marca para Editorial", shortLabel: "ENV. EDITORIAL" },
  "send-visual-tokens-to-design": { label: "Enviar Tokens Visuais para Design", shortLabel: "ENV. DESIGN" },
  "generate-editorial-brief": { label: "Gerar Briefing Editorial", shortLabel: "GERAR BRIEF" },
  "create-carousel-copy": { label: "Criar Texto do Carrossel", shortLabel: "CARROSSEL" },
  "create-caption": { label: "Criar Legenda", shortLabel: "LEGENDA" },
  "send-brief-to-design": { label: "Enviar Briefing para o MCP de Design", shortLabel: "ENV. DESIGN" },
  "send-script-to-narration": { label: "Enviar Roteiro para o MCP de Narração", shortLabel: "ENV. ROTEIRO" },
  "generate-narration-copy": { label: "Gerar Texto de Narração", shortLabel: "NARRAÇÃO" },
  "select-voice-id": { label: "Selecionar ID de Voz", shortLabel: "ID DE VOZ" },
  "prepare-voice-prompt": { label: "Preparar Prompt de Voz", shortLabel: "PROMPT VOZ" },
  "send-audio-brief-to-output": {
    label: "Enviar Briefing de Áudio para a Estação de Saída",
    shortLabel: "ENV. SAÍDA"
  },
  "generate-design-prompt": { label: "Gerar Prompt de Design", shortLabel: "PROMPT DESIGN" },
  "select-visual-style": { label: "Selecionar Estilo Visual", shortLabel: "ESTILO VISUAL" },
  "assemble-carousel-layout": { label: "Montar Layout do Carrossel", shortLabel: "LAYOUT" },
  "prepare-image-prompt": { label: "Preparar Prompt de Imagem", shortLabel: "PROMPT IMG" },
  "review-current-post": { label: "Revisar Post Atual", shortLabel: "REVISAR" },
  "approve-content": { label: "Aprovar Conteúdo", shortLabel: "APROVAR" },
  "export-package": { label: "Exportar Pacote", shortLabel: "EXPORTAR" },
  "mark-ready-to-publish": { label: "Marcar como Pronto para Publicar", shortLabel: "PRONTO" }
};

const NPC_ACTION_IDS: Record<NpcId, ActionId[]> = {
  "brand-brain": [
    "view-brand-rules",
    "validate-brand-compliance",
    "send-brand-tokens-to-editorial",
    "send-visual-tokens-to-design"
  ],
  editorial: [
    "generate-editorial-brief",
    "create-carousel-copy",
    "create-caption",
    "send-brief-to-design",
    "send-script-to-narration"
  ],
  narration: [
    "generate-narration-copy",
    "select-voice-id",
    "prepare-voice-prompt",
    "send-audio-brief-to-output"
  ],
  design: [
    "generate-design-prompt",
    "select-visual-style",
    "assemble-carousel-layout",
    "prepare-image-prompt"
  ],
  "output-review": ["review-current-post", "approve-content", "export-package", "mark-ready-to-publish"]
};

const ACTIONS_BY_NPC: Record<NpcId, NpcAction[]> = Object.fromEntries(
  Object.entries(NPC_ACTION_IDS).map(([npcId, actionIds]) => [
    npcId,
    actionIds.map((actionId) => ({ id: actionId, label: ACTION_DEFINITIONS[actionId].label }))
  ])
) as Record<NpcId, NpcAction[]>;

export function getActionDefinition(actionId: ActionId) {
  return ACTION_DEFINITIONS[actionId];
}

export function getActionLabel(actionId: ActionId) {
  return ACTION_DEFINITIONS[actionId].label;
}

export function getShortActionLabel(actionId: ActionId) {
  return ACTION_DEFINITIONS[actionId].shortLabel;
}

export function getNpcActions(npcId: NpcId) {
  return ACTIONS_BY_NPC[npcId];
}

export function getWorkflowTaskIdForAction(npcId: NpcId, actionId: ActionId): WorkflowTaskId | null {
  if (npcId === "editorial" && actionId === "generate-editorial-brief") {
    return "generate-brief";
  }

  if (npcId === "editorial" && actionId === "send-brief-to-design") {
    return "send-to-design";
  }

  if (npcId === "output-review" && (actionId === "review-current-post" || actionId === "approve-content")) {
    return "review-output";
  }

  return null;
}
