import type { ActionId } from "../domain/mcpActions";
import { getShortActionLabel as getDomainShortActionLabel } from "../domain/mcpActions";

export const UI3D_THEME = {
  panelBase: "#101723",
  panelLine: "#eef6ff",
  textPrimary: "#f8fbff",
  textSecondary: "#c9d2df",
  textDark: "#1c2837",
  success: "#4dd393",
  idle: "#9fb2ca"
};

export function getShortActionLabel(actionId: ActionId) {
  return getDomainShortActionLabel(actionId);
}

export function getShortRoleLabel(id: string) {
  switch (id) {
    case "brand-brain":
      return "NUCLEO MARCA";
    case "editorial":
      return "LOGICA BRIEF";
    case "narration":
      return "PREP VOZ";
    case "design":
      return "BUILD VISUAL";
    case "output-review":
      return "REVISÃO FINAL";
    default:
      return "MCP";
  }
}

export function getShortTaskLabel(taskId: string) {
  switch (taskId) {
    case "talk-brand-brain":
      return "FALAR MARCA";
    case "generate-brief":
      return "GERAR BRIEF";
    case "send-to-design":
      return "ENV. DESIGN";
    case "review-output":
      return "REVISAR";
    default:
      return taskId.toUpperCase();
  }
}
