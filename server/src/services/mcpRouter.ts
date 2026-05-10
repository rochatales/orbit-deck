// ─── MCP Router ───
// Routes NPC + action pairs to the correct service.
// Phase 3.5: Editorial actions go to the real editorialService;
// other NPCs still use the simulated executor.

import type { ActionId, McpActionResponse, NpcId } from "../types.js";
import { executeAction } from "./brandBrainService.js";
import {
  generateEditorialBrief,
  loadBrandRules,
  loadDesignStyle,
} from "./editorialService.js";

const NPC_IDS: Set<string> = new Set<string>([
  "brand-brain",
  "editorial",
  "narration",
  "design",
  "output-review",
]);

const ACTION_IDS: Set<string> = new Set<string>([
  "view-brand-rules",
  "validate-brand-compliance",
  "send-brand-tokens-to-editorial",
  "send-visual-tokens-to-design",
  "generate-editorial-brief",
  "create-carousel-copy",
  "create-caption",
  "send-brief-to-design",
  "send-script-to-narration",
  "generate-narration-copy",
  "select-voice-id",
  "prepare-voice-prompt",
  "send-audio-brief-to-output",
  "generate-design-prompt",
  "select-visual-style",
  "assemble-carousel-layout",
  "prepare-image-prompt",
  "review-current-post",
  "approve-content",
  "export-package",
  "mark-ready-to-publish",
]);

export function isValidNpcId(value: string): value is NpcId {
  return NPC_IDS.has(value);
}

export function isValidActionId(value: string): value is ActionId {
  return ACTION_IDS.has(value);
}

// ─── Real action handlers ───

async function handleBrandBrainAction(
  actionId: ActionId,
  clientSlug: string
): Promise<McpActionResponse> {
  const start = Date.now();

  if (actionId === "view-brand-rules") {
    const rules = await loadBrandRules(clientSlug);
    return {
      ok: true,
      npcId: "brand-brain",
      actionId,
      clientSlug,
      message: `Regras da marca carregadas de "${rules.path}" (${rules.content.length} caracteres).`,
      durationMs: Date.now() - start,
      data: {
        rulesPath: rules.path,
        rulesLength: rules.content.length,
        rulesPreview: rules.content.slice(0, 500),
      },
    };
  }

  // Other brand-brain actions → simulated for now
  return executeAction("brand-brain", actionId, clientSlug);
}

async function handleEditorialAction(
  actionId: ActionId,
  clientSlug: string
): Promise<McpActionResponse> {
  const start = Date.now();

  if (actionId === "generate-editorial-brief") {
    const brief = await generateEditorialBrief(clientSlug);
    return {
      ok: true,
      npcId: "editorial",
      actionId,
      clientSlug,
      message: `Briefing editorial gerado para "${brief.clientName}". Plataformas: ${brief.platforms.join(", ")}. Legendas: ${brief.captionLimits.min}–${brief.captionLimits.max} chars. Padrões visuais: ${brief.contentPatterns.join(", ") || "nenhum definido"}.`,
      durationMs: Date.now() - start,
      data: brief,
    };
  }

  // Other editorial actions → simulated for now
  return executeAction("editorial", actionId, clientSlug);
}

async function handleDesignAction(
  actionId: ActionId,
  clientSlug: string
): Promise<McpActionResponse> {
  const start = Date.now();

  if (
    actionId === "generate-design-prompt" ||
    actionId === "select-visual-style"
  ) {
    const style = await loadDesignStyle(clientSlug);
    return {
      ok: true,
      npcId: "design",
      actionId,
      clientSlug,
      message: `Design style carregado de "${style.path}" (${style.content.length} caracteres).`,
      durationMs: Date.now() - start,
      data: {
        stylePath: style.path,
        styleLength: style.content.length,
        stylePreview: style.content.slice(0, 500),
      },
    };
  }

  return executeAction("design", actionId, clientSlug);
}

// ─── Main router ───

export async function routeMcpAction(
  npcId: NpcId,
  actionId: ActionId,
  clientSlug: string
): Promise<McpActionResponse> {
  switch (npcId) {
    case "brand-brain":
      return handleBrandBrainAction(actionId, clientSlug);
    case "editorial":
      return handleEditorialAction(actionId, clientSlug);
    case "design":
      return handleDesignAction(actionId, clientSlug);
    default:
      // narration, output-review → simulated for now
      return executeAction(npcId, actionId, clientSlug);
  }
}
