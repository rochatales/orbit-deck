import type { FastifyInstance } from "fastify";
import {
  runSmartLabChat,
  type SmartLabChatRequest
} from "../services/smartLabService.js";

interface SmartLabChatBody {
  clientSlug: string;
  clientDisplayName: string;
  segment: string;
  currentRulesMd: string;
  userMessage: string;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
}

function isValidConversation(
  value: unknown
): value is SmartLabChatRequest["conversation"] {
  return Array.isArray(value) && value.every((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const candidate = entry as { role?: unknown; content?: unknown };
    return (
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.content === "string"
    );
  });
}

export async function smartLabRoutes(app: FastifyInstance) {
  app.post<{ Body: SmartLabChatBody }>(
    "/api/smart-lab/chat",
    async (request, reply) => {
      const body = request.body ?? ({} as Partial<SmartLabChatBody>);

      if (!body.clientSlug || typeof body.clientSlug !== "string") {
        return reply.status(400).send({ error: "clientSlug é obrigatório." });
      }

      if (!body.clientDisplayName || typeof body.clientDisplayName !== "string") {
        return reply
          .status(400)
          .send({ error: "clientDisplayName é obrigatório." });
      }

      if (!body.segment || typeof body.segment !== "string") {
        return reply.status(400).send({ error: "segment é obrigatório." });
      }

      if (!body.currentRulesMd || typeof body.currentRulesMd !== "string") {
        return reply
          .status(400)
          .send({ error: "currentRulesMd é obrigatório." });
      }

      if (!body.userMessage || typeof body.userMessage !== "string") {
        return reply.status(400).send({ error: "userMessage é obrigatório." });
      }

      if (!isValidConversation(body.conversation)) {
        return reply
          .status(400)
          .send({ error: "conversation deve conter mensagens user/assistant." });
      }

      try {
        return await runSmartLabChat({
          clientSlug: body.clientSlug,
          clientDisplayName: body.clientDisplayName,
          segment: body.segment,
          currentRulesMd: body.currentRulesMd,
          userMessage: body.userMessage,
          conversation: body.conversation
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao processar o chat do Smart Lab.";
        return reply.status(500).send({ error: message });
      }
    }
  );
}
