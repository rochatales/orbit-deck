// ─── Brand Brain Service ───
// Placeholder service that will later connect to the real MCP pipeline.
// For now it resolves immediately with a simulated result.

import type { ActionId, McpActionResponse, NpcId } from "../types.js";

function getActionDurationMs(actionId: string): number {
  const seed = actionId
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return 1200 + (seed % 1800);
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function executeAction(
  npcId: NpcId,
  actionId: ActionId,
  clientSlug: string
): Promise<McpActionResponse> {
  const durationMs = getActionDurationMs(actionId);

  // Simulate processing time — this is where the real MCP call will go
  await delay(durationMs);

  return {
    ok: true,
    npcId,
    actionId,
    clientSlug,
    message: `Ação "${actionId}" executada com sucesso para o cliente "${clientSlug}" via NPC "${npcId}".`,
    durationMs,
  };
}
