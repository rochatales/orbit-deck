import {
  CalendarDays,
  FileText,
  FolderClosed,
  HardDrive,
  NotebookPen,
  type LucideIcon
} from "lucide-react";
import type { ToolId } from "../domain/decks";

/**
 * Resolve cada `ToolId` para um ícone do `lucide-react`.
 *
 * As MCPs (Drive, Docs, Calendar, Notion, pasta local) ainda não têm
 * conectores reais; estes ícones são pictogramas neutros até a Fase 3
 * trazer adapters de OAuth.
 */
export const TOOL_ICON_REGISTRY: Record<ToolId, LucideIcon> = {
  "google-drive": HardDrive,
  "google-docs": FileText,
  calendar: CalendarDays,
  notion: NotebookPen,
  "local-folder": FolderClosed
};

export function getToolIcon(toolId: ToolId): LucideIcon {
  return TOOL_ICON_REGISTRY[toolId];
}
