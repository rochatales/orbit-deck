import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  BookOpen,
  CheckCheck,
  Eye,
  FileAudio,
  FileCheck,
  FileImage,
  FileText,
  ImagePlus,
  LayoutTemplate,
  MessageSquareQuote,
  Package,
  Palette,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Stamp,
  Search,
  FileSignature,
  FlaskConical,
  Images,
  ListTodo,
  Lightbulb,
  BarChart,
  Home
} from "lucide-react";
import type { ActionId } from "../domain/mcpActions";

export interface ActionMeta {
  icon: LucideIcon;
  shortLabel: string;
}

const ACTION_META: Record<ActionId, ActionMeta> = {
  "view-brand-rules": { icon: BookOpen, shortLabel: "Regras" },
  "validate-brand-compliance": { icon: ShieldCheck, shortLabel: "Validar" },
  "send-brand-tokens-to-editorial": { icon: Send, shortLabel: "Enviar" },
  "send-visual-tokens-to-design": { icon: Send, shortLabel: "Enviar" },
  "generate-editorial-brief": { icon: Sparkles, shortLabel: "Gerar" },
  "create-carousel-copy": { icon: FileText, shortLabel: "Texto" },
  "create-caption": { icon: MessageSquareQuote, shortLabel: "Legenda" },
  "send-brief-to-design": { icon: Send, shortLabel: "Enviar" },
  "send-script-to-narration": { icon: Send, shortLabel: "Enviar" },
  "generate-narration-copy": { icon: AudioLines, shortLabel: "Narração" },
  "select-voice-id": { icon: Radio, shortLabel: "Voz" },
  "prepare-voice-prompt": { icon: FileAudio, shortLabel: "Prompt" },
  "send-audio-brief-to-output": { icon: Send, shortLabel: "Enviar" },
  "generate-design-prompt": { icon: Sparkles, shortLabel: "Prompt" },
  "select-visual-style": { icon: Palette, shortLabel: "Estilo" },
  "assemble-carousel-layout": { icon: LayoutTemplate, shortLabel: "Layout" },
  "prepare-image-prompt": { icon: ImagePlus, shortLabel: "Imagem" },
  "review-current-post": { icon: Eye, shortLabel: "Revisar" },
  "approve-content": { icon: CheckCheck, shortLabel: "Aprovar" },
  "export-package": { icon: Package, shortLabel: "Exportar" },
  "mark-ready-to-publish": { icon: Stamp, shortLabel: "Publicar" },
  "inspect-visual-system": { icon: Search, shortLabel: "Inspecionar" },
  "validate-brand-consistency": { icon: FileSignature, shortLabel: "Validar" },
  "test-design-prompt": { icon: FlaskConical, shortLabel: "Testar" },
  "review-image-inputs": { icon: Images, shortLabel: "Imagens" },
  "send-to-design-mcp": { icon: Send, shortLabel: "Enviar" },
  "review-active-missions": { icon: ListTodo, shortLabel: "Missões" },
  "open-inspiration-notes": { icon: Lightbulb, shortLabel: "Notas" },
  "check-deck-progress": { icon: BarChart, shortLabel: "Progresso" },
  "return-to-orbit-hub": { icon: Home, shortLabel: "Orbit Hub" }
};

export function getActionMeta(actionId: ActionId): ActionMeta {
  return ACTION_META[actionId] ?? { icon: FileCheck, shortLabel: "Ação" };
}
