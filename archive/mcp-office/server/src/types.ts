// ─── Shared types between server and frontend ───
// These mirror the contracts established in Phase 2 (src/domain/)

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

export interface ClientCapabilities {
  brandBrain: boolean;
  editorial: boolean;
  design: boolean;
  narration: boolean;
  outputReview: boolean;
}

export interface ClientProfile {
  slug: string;
  displayName: string;
  status: "active" | "draft";
  summary: string;
  capabilities: ClientCapabilities;
}

export interface NpcAction {
  id: ActionId;
  label: string;
}

export interface McpActionRequest {
  clientSlug: string;
}

export interface McpActionResponse {
  ok: boolean;
  npcId: NpcId;
  actionId: ActionId;
  clientSlug: string;
  message: string;
  durationMs: number;
  data?: unknown;
}
