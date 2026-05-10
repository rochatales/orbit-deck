import type { NpcId } from "./mcpActions";

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

// Phase 1 local snapshot of the client base that currently lives in
// instagram-editorial-system. The next phase can replace this with the API bridge.
export const CLIENT_PROFILES: ClientProfile[] = [
  {
    slug: "hospital-samer",
    displayName: "Hospital Samer",
    status: "active",
    summary: "Cliente mais completo hoje, com fluxo editorial, design, narração e revisão final.",
    capabilities: {
      brandBrain: true,
      editorial: true,
      design: true,
      narration: true,
      outputReview: true
    }
  },
  {
    slug: "iron-house",
    displayName: "Iron House",
    status: "active",
    summary: "Editorial e design prontos; a etapa de narração ainda não está habilitada.",
    capabilities: {
      brandBrain: true,
      editorial: true,
      design: true,
      narration: false,
      outputReview: true
    }
  },
  {
    slug: "pousada-flor-de-penedo",
    displayName: "Pousada Flor de Penedo",
    status: "active",
    summary: "Cliente ativo com foco em editorial visual; voz segue desabilitada por enquanto.",
    capabilities: {
      brandBrain: true,
      editorial: true,
      design: true,
      narration: false,
      outputReview: true
    }
  },
  {
    slug: "rodar-pneus",
    displayName: "Rodar Pneus",
    status: "active",
    summary: "Operação editorial e visual ativa para Instagram, sem pipeline de narração neste momento.",
    capabilities: {
      brandBrain: true,
      editorial: true,
      design: true,
      narration: false,
      outputReview: true
    }
  },
  {
    slug: "verdiplan",
    displayName: "Verdiplan",
    status: "active",
    summary: "Cliente ativo com editorial, design e revisão prontos; narração segue futura.",
    capabilities: {
      brandBrain: true,
      editorial: true,
      design: true,
      narration: false,
      outputReview: true
    }
  }
];

export function getClientProfile(slug: string | null) {
  if (!slug) {
    return null;
  }

  return CLIENT_PROFILES.find((client) => client.slug === slug) ?? null;
}

export function npcSupportsClient(npcId: NpcId, client: ClientProfile) {
  switch (npcId) {
    case "brand-brain":
      return client.capabilities.brandBrain;
    case "editorial":
      return client.capabilities.editorial;
    case "design":
      return client.capabilities.design;
    case "narration":
      return client.capabilities.narration;
    case "output-review":
      return client.capabilities.outputReview;
    default:
      return true;
  }
}
