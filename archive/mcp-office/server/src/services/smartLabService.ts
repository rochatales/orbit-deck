interface SmartLabConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SmartLabChatRequest {
  clientSlug: string;
  clientDisplayName: string;
  segment: string;
  currentRulesMd: string;
  userMessage: string;
  conversation: SmartLabConversationMessage[];
}

export interface SmartLabChatResponse {
  ok: true;
  clientSlug: string;
  reply: string;
  updatedRulesMd: string;
  model: string;
}

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

const DEFAULT_SMART_LAB_MODEL = process.env.SMART_LAB_MODEL ?? "gpt-4.1-mini";
const SMART_LAB_API_BASE = (
  process.env.SMART_LAB_API_BASE ?? "https://api.openai.com/v1"
).replace(/\/+$/, "");

function getSmartLabApiKey(): string {
  return process.env.SMART_LAB_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
}

function normalizeAssistantContent(
  content: string | Array<{ type?: string; text?: string }> | undefined
): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();
  }

  return "";
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractJsonPayload(text: string): Record<string, unknown> {
  const cleaned = stripCodeFence(text);

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("A IA respondeu sem JSON válido.");
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<
      string,
      unknown
    >;
  }
}

export async function runSmartLabChat(
  request: SmartLabChatRequest
): Promise<SmartLabChatResponse> {
  const apiKey = getSmartLabApiKey();
  if (!apiKey) {
    throw new Error(
      "SMART_LAB_API_KEY não configurada. Defina SMART_LAB_API_KEY ou OPENAI_API_KEY no server."
    );
  }

  const model = DEFAULT_SMART_LAB_MODEL;
  const recentConversation = request.conversation.slice(-10);

  const response = await fetch(`${SMART_LAB_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Voce e a IA integrada do Smart Lab de um workplace criativo. Sua tarefa e conversar em portugues do Brasil, analisar o rules.md atual e devolve-lo melhorado sem perder informacoes importantes. Responda SEMPRE em JSON com as chaves reply e updatedRulesMd. reply deve ser curto, objetivo e colaborativo. updatedRulesMd deve conter o markdown completo, ja revisado, pronto para substituir o rules.md atual."
        },
        {
          role: "system",
          content: [
            `Cliente: ${request.clientDisplayName}`,
            `Slug: ${request.clientSlug}`,
            `Segmento: ${request.segment}`,
            "Contexto do Smart Lab: o player quer iterar o rules.md conversando com a IA e vendo a versao revisada em tempo real."
          ].join("\n")
        },
        ...recentConversation.map((message) => ({
          role: message.role,
          content: message.content
        })),
        {
          role: "user",
          content: [
            `Pedido do player: ${request.userMessage}`,
            "",
            "Rules.md atual:",
            request.currentRulesMd,
            "",
            "Entregue um JSON com:",
            '- "reply": resumo da melhoria feita e proximo passo sugerido;',
            '- "updatedRulesMd": documento completo atualizado em markdown.'
          ].join("\n")
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Falha ao consultar a IA do Smart Lab (${response.status}). ${errorText}`.trim()
    );
  }

  const body = (await response.json()) as ChatCompletionsResponse;
  const rawContent = normalizeAssistantContent(body.choices?.[0]?.message?.content);
  const payload = extractJsonPayload(rawContent);

  const reply =
    typeof payload.reply === "string" && payload.reply.trim().length > 0
      ? payload.reply.trim()
      : "Atualizei o rules.md com base no seu pedido.";
  const updatedRulesMd =
    typeof payload.updatedRulesMd === "string" &&
    payload.updatedRulesMd.trim().length > 0
      ? payload.updatedRulesMd.trim()
      : request.currentRulesMd;

  return {
    ok: true,
    clientSlug: request.clientSlug,
    reply,
    updatedRulesMd,
    model
  };
}
