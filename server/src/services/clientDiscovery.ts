// ─── Client Discovery Service ───
// Reads real client data from the instagram-editorial-system filesystem.
// The bridge reads config.json from each client directory to extract:
// slug, displayName, summary, capabilities.

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ClientCapabilities, ClientProfile } from "../types.js";

// Resolve the editorial system root relative to the server directory.
// Structure: game-workplace/server/ → ../../instagram-editorial-system/
const EDITORIAL_SYSTEM_ROOT =
  process.env.EDITORIAL_SYSTEM_PATH ??
  join(import.meta.dirname, "..", "..", "..", "instagram-editorial-system");

const CLIENTS_DIR = join(EDITORIAL_SYSTEM_ROOT, "clients");

interface RawClientConfig {
  brand_slug: string;
  display_name: string;
  status: string;
  editorial?: { enabled?: boolean; rules_path?: string };
  design?: { enabled?: boolean };
  reels?: { enabled?: boolean };
  video_handoff?: { enabled?: boolean };
  notes?: string[];
}

function deriveCapabilities(config: RawClientConfig): ClientCapabilities {
  return {
    // Brand Brain is always available if the client has a config at all
    brandBrain: true,
    editorial: config.editorial?.enabled ?? false,
    design: config.design?.enabled ?? false,
    // Narration is true only if the client has an explicit reels/video section enabled
    narration: config.reels?.enabled ?? config.video_handoff?.enabled ?? false,
    // Output review is available if both editorial and design are ready
    outputReview:
      (config.editorial?.enabled ?? false) &&
      (config.design?.enabled ?? false),
  };
}

function deriveSummary(config: RawClientConfig): string {
  const parts: string[] = [];
  if (config.editorial?.enabled) parts.push("editorial");
  if (config.design?.enabled) parts.push("design");
  if (config.reels?.enabled) parts.push("reels");
  if (config.video_handoff?.enabled) parts.push("narração/vídeo");

  if (parts.length === 0) {
    return "Cliente em fase de configuração.";
  }

  const formatted = parts.join(", ");
  return `Pipelines ativos: ${formatted}.`;
}

async function loadClientConfig(
  clientDir: string
): Promise<ClientProfile | null> {
  const configPath = join(clientDir, "config.json");

  try {
    const configStat = await stat(configPath);
    if (!configStat.isFile()) return null;
  } catch {
    return null;
  }

  try {
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw) as RawClientConfig;

    if (!config.brand_slug || !config.display_name) {
      return null;
    }

    return {
      slug: config.brand_slug,
      displayName: config.display_name,
      status: (config.status === "active" ? "active" : "draft") as
        | "active"
        | "draft",
      summary: deriveSummary(config),
      capabilities: deriveCapabilities(config),
    };
  } catch (err) {
    console.error(`[ClientDiscovery] Failed to parse ${configPath}:`, err);
    return null;
  }
}

let cachedProfiles: ClientProfile[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // Re-scan every 30s

export async function discoverClients(): Promise<ClientProfile[]> {
  const now = Date.now();
  if (cachedProfiles && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProfiles;
  }

  try {
    const entries = await readdir(CLIENTS_DIR, { withFileTypes: true });
    const clientDirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith(".")
    );

    const profiles = await Promise.all(
      clientDirs.map((dir) => loadClientConfig(join(CLIENTS_DIR, dir.name)))
    );

    cachedProfiles = profiles
      .filter((p): p is ClientProfile => p !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    cacheTimestamp = now;
    console.log(
      `[ClientDiscovery] Loaded ${cachedProfiles.length} clients from ${CLIENTS_DIR}`
    );

    return cachedProfiles;
  } catch (err) {
    console.error(
      `[ClientDiscovery] Cannot read clients directory: ${CLIENTS_DIR}`,
      err
    );
    return cachedProfiles ?? [];
  }
}

export async function discoverClientBySlug(
  slug: string
): Promise<ClientProfile | null> {
  const clients = await discoverClients();
  return clients.find((c) => c.slug === slug) ?? null;
}

export function getEditorialSystemRoot(): string {
  return EDITORIAL_SYSTEM_ROOT;
}
