// ─── API Client ───
// Thin fetch wrapper for the MCP Office backend.
// Falls back gracefully if the server is unreachable.

import type { ClientProfile } from "../domain/clientProfiles";
import type { ActionId, NpcId } from "../domain/mcpActions";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:3001";

export interface McpActionResponse {
  ok: boolean;
  npcId: NpcId;
  actionId: ActionId;
  clientSlug: string;
  message: string;
  durationMs: number;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Clients ───

export async function fetchClients(): Promise<ClientProfile[]> {
  return apiFetch<ClientProfile[]>("/api/clients");
}

export async function fetchClientBySlug(slug: string): Promise<ClientProfile> {
  return apiFetch<ClientProfile>(`/api/clients/${encodeURIComponent(slug)}`);
}

// ─── MCP Actions ───

export async function postMcpAction(
  npcId: NpcId,
  actionId: ActionId,
  clientSlug: string
): Promise<McpActionResponse> {
  return apiFetch<McpActionResponse>(
    `/api/mcp/${encodeURIComponent(npcId)}/actions/${encodeURIComponent(actionId)}`,
    {
      method: "POST",
      body: JSON.stringify({ clientSlug }),
    }
  );
}

// ─── Health ───

export async function checkApiHealth(): Promise<boolean> {
  try {
    const result = await apiFetch<{ status: string }>("/api/health");
    return result.status === "ok";
  } catch {
    return false;
  }
}
