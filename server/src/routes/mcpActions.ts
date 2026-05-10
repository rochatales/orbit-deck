// ─── MCP Actions Route ───
// POST /api/mcp/:npcId/actions/:actionId
// Body: { clientSlug: string }

import type { FastifyInstance } from "fastify";
import { isValidActionId, isValidNpcId, routeMcpAction } from "../services/mcpRouter.js";
import { discoverClientBySlug } from "../services/clientDiscovery.js";

interface McpActionParams {
  npcId: string;
  actionId: string;
}

interface McpActionBody {
  clientSlug: string;
}

export async function mcpActionsRoutes(app: FastifyInstance) {
  app.post<{ Params: McpActionParams; Body: McpActionBody }>(
    "/api/mcp/:npcId/actions/:actionId",
    async (request, reply) => {
      const { npcId, actionId } = request.params;
      const { clientSlug } = request.body ?? {};

      // ── Validate NPC ID ──
      if (!isValidNpcId(npcId)) {
        return reply.status(400).send({
          error: `NPC inválido: "${npcId}"`,
        });
      }

      // ── Validate Action ID ──
      if (!isValidActionId(actionId)) {
        return reply.status(400).send({
          error: `Ação inválida: "${actionId}"`,
        });
      }

      // ── Validate Client ──
      if (!clientSlug || typeof clientSlug !== "string") {
        return reply.status(400).send({
          error: "clientSlug é obrigatório no body da requisição.",
        });
      }

      const client = await discoverClientBySlug(clientSlug);
      if (!client) {
        return reply.status(404).send({
          error: `Cliente não encontrado: "${clientSlug}"`,
        });
      }

      // ── Execute ──
      try {
        const result = await routeMcpAction(npcId, actionId, clientSlug);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro interno ao executar ação MCP.";
        return reply.status(500).send({
          ok: false,
          npcId,
          actionId,
          clientSlug,
          message,
          durationMs: 0,
        });
      }
    }
  );
}
