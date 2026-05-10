// ─── Editorial Brief Service ───
// Generates an editorial brief by reading the real client config + rules
// from the instagram-editorial-system filesystem.
// This is the first real vertical slice: game → API → real data → response.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getEditorialSystemRoot } from "./clientDiscovery.js";

interface EditorialBrief {
  clientSlug: string;
  clientName: string;
  rulesPath: string;
  designStylePath: string;
  outputsDir: string;
  platforms: string[];
  captionLimits: {
    min: number;
    max: number;
  };
  maxHashtags: number;
  requiredCta: string;
  brandComplianceThreshold: number;
  postsPerMonth: number | null;
  cardsPerPost: number | null;
  format: string | null;
  contentPatterns: string[];
  visualRules: string[];
  notes: string[];
  generatedAt: string;
}

interface RawClientConfig {
  brand_slug: string;
  display_name: string;
  editorial?: {
    enabled?: boolean;
    rules_path?: string;
    design_style_path?: string;
    outputs_dir?: string;
    default_platforms?: string[];
    min_caption_chars?: number;
    max_caption_chars?: number;
    max_hashtags?: number;
    required_cta?: string;
    brand_compliance_threshold?: number;
    posts_per_month?: number;
    cards_per_post?: number;
    format?: string;
  };
  design?: {
    enabled?: boolean;
    content_patterns?: Record<string, { name: string }>;
    visual_rules?: string[];
  };
  notes?: string[];
}

async function loadRawConfig(clientSlug: string): Promise<RawClientConfig> {
  const root = getEditorialSystemRoot();
  const configPath = join(root, "clients", clientSlug, "config.json");
  const raw = await readFile(configPath, "utf-8");
  return JSON.parse(raw) as RawClientConfig;
}

export async function generateEditorialBrief(
  clientSlug: string
): Promise<EditorialBrief> {
  const config = await loadRawConfig(clientSlug);

  if (!config.editorial?.enabled) {
    throw new Error(
      `Editorial não está habilitado para o cliente "${clientSlug}".`
    );
  }

  const editorial = config.editorial;
  const design = config.design;

  const contentPatterns = design?.content_patterns
    ? Object.values(design.content_patterns).map((p) => p.name)
    : [];

  return {
    clientSlug: config.brand_slug,
    clientName: config.display_name,
    rulesPath: editorial.rules_path ?? `clients/${clientSlug}/rules.md`,
    designStylePath:
      editorial.design_style_path ??
      `clients/${clientSlug}/design-style.md`,
    outputsDir: editorial.outputs_dir ?? `outputs/${clientSlug}`,
    platforms: editorial.default_platforms ?? ["Instagram"],
    captionLimits: {
      min: editorial.min_caption_chars ?? 100,
      max: editorial.max_caption_chars ?? 500,
    },
    maxHashtags: editorial.max_hashtags ?? 6,
    requiredCta: editorial.required_cta ?? "",
    brandComplianceThreshold: editorial.brand_compliance_threshold ?? 9,
    postsPerMonth: editorial.posts_per_month ?? null,
    cardsPerPost: editorial.cards_per_post ?? null,
    format: editorial.format ?? null,
    contentPatterns,
    visualRules: design?.visual_rules ?? [],
    notes: config.notes ?? [],
    generatedAt: new Date().toISOString(),
  };
}

// ─── Brand Rules Loader ───
// Reads the actual rules.md for a client

export async function loadBrandRules(
  clientSlug: string
): Promise<{ content: string; path: string }> {
  const root = getEditorialSystemRoot();
  const config = await loadRawConfig(clientSlug);
  const rulesRelPath =
    config.editorial?.rules_path ?? `clients/${clientSlug}/rules.md`;
  const rulesPath = join(root, rulesRelPath);

  try {
    const content = await readFile(rulesPath, "utf-8");
    return { content, path: rulesRelPath };
  } catch {
    throw new Error(
      `Arquivo de regras não encontrado: ${rulesRelPath}`
    );
  }
}

// ─── Design Style Loader ───

export async function loadDesignStyle(
  clientSlug: string
): Promise<{ content: string; path: string }> {
  const root = getEditorialSystemRoot();
  const config = await loadRawConfig(clientSlug);
  const styleRelPath =
    config.editorial?.design_style_path ??
    `clients/${clientSlug}/design-style.md`;
  const stylePath = join(root, styleRelPath);

  try {
    const content = await readFile(stylePath, "utf-8");
    return { content, path: styleRelPath };
  } catch {
    throw new Error(
      `Arquivo de design style não encontrado: ${styleRelPath}`
    );
  }
}
