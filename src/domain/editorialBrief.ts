import { CLIENT_SEGMENTS, type ClientSetupAnswers } from "./clientSetupTemplate";

/**
 * Editorial brief gerado pelo Mister (Editorial MCP) a partir dos dados
 * que o player cadastrou com Eden no Brand Brain. Pura derivação local —
 * sem dependência de servidor — para sustentar o loop completo da MVP
 * mesmo offline. Quando o backend real estiver pronto (Fase 3), o gerador
 * passa a ser um wrapper sobre `/api/editorial/brief`.
 */

export interface BriefPost {
  index: number;
  pillar: string;
  /** Sugestão de hook para abrir o post. */
  hook: string;
  /** Quantidade sugerida de cards no carrossel. */
  cardsHint: string;
  /** Lembrete do CTA padrão. */
  ctaReminder: string;
}

export interface GeneratedBrief {
  clientSlug: string;
  clientDisplayName: string;
  generatedAt: number;
  theme: string;
  segmentLabel: string;
  goal: string;
  audience: string;
  pillars: string[];
  toneAdjectives: string[];
  toneAvoid: string[];
  palette: string[];
  cta: string;
  postsPerMonth: number;
  cardsPerPostHint: string;
  posts: BriefPost[];
  hashtagGuidance: string[];
  approvalFlow: string[];
  outputDir: string;
  /** Texto markdown pronto para copy-to-clipboard. */
  markdown: string;
}

const DEFAULT_THEME = "Conteúdo mensal alinhado aos pilares da marca";
const DEFAULT_POSTS_PER_MONTH = 4;
const DEFAULT_CARDS_PER_POST = "3 a 5 cards";

const SEGMENT_HASHTAG_GUIDANCE: Partial<Record<ClientSetupAnswers["segment"], string[]>> = {
  healthcare: [
    "Use hashtags institucionais e educativas (saúde, prevenção).",
    "Evite hashtags comerciais agressivas.",
    "Inclua disclaimers em temas sensíveis."
  ],
  beauty: [
    "Hashtags focadas em cuidado e tecnologia, evitando comparação.",
    "Não use antes/depois sem autorização explícita."
  ],
  hospitality: [
    "Hashtags regionais + experiência (turismo, gastronomia).",
    "Sem comparação direta com concorrentes."
  ],
  education: [
    "Hashtags institucionais e temas de ensino.",
    "Sem promessas de aprovação."
  ],
  "real-estate": [
    "Inclua dados regulatórios (CRECI) quando aplicável.",
    "Evite hashtags de valorização garantida."
  ],
  retail: [
    "Hashtags por categoria de produto + sazonalidade.",
    "Evite excesso de hashtags promocionais."
  ],
  services: [
    "Hashtags focadas em autoridade e nicho profissional."
  ],
  technology: [
    "Hashtags técnicas + comunidade (não confundir audiência).",
    "Evite jargão excessivo quando o público for misto."
  ],
  other: [
    "Selecione poucas hashtags relevantes e institucionais.",
    "Evite excesso ou hashtags genéricas."
  ]
};

const SEGMENT_APPROVAL_FLOW: Partial<Record<ClientSetupAnswers["segment"], string[]>> = {
  healthcare: [
    "1. Revisão editorial (clareza e qualidade)",
    "2. Revisão médica / compliance (temas sensíveis)",
    "3. Revisão de marca (Brand Brain)",
    "4. Aprovação final no Output Review"
  ]
};

const GENERIC_APPROVAL_FLOW = [
  "1. Revisão editorial (clareza e qualidade)",
  "2. Revisão de marca (Brand Brain)",
  "3. Aprovação final no Output Review"
];

function segmentLabel(answers: ClientSetupAnswers): string {
  return (
    CLIENT_SEGMENTS.find((s) => s.id === answers.segment)?.label ?? answers.segment
  );
}

function generateHookForPillar(pillar: string, tone: string[], audience: string): string {
  // Hook genérico mas útil — combina o pilar com um tom dominante e o público.
  const toneWord = tone[0] ?? "claro";
  const audienceShort = audience.split(/[.;,]/)[0]?.trim() || "o público";
  return `${pillar}: abertura ${toneWord} que conecta com ${audienceShort}.`;
}

function buildPosts(answers: ClientSetupAnswers, postsPerMonth: number): BriefPost[] {
  if (answers.pillars.length === 0) return [];
  const posts: BriefPost[] = [];
  for (let i = 0; i < postsPerMonth; i += 1) {
    const pillar = answers.pillars[i % answers.pillars.length];
    posts.push({
      index: i + 1,
      pillar,
      hook: generateHookForPillar(pillar, answers.toneAdjectives, answers.audience),
      cardsHint: DEFAULT_CARDS_PER_POST,
      ctaReminder: answers.cta
    });
  }
  return posts;
}

function renderMarkdown(brief: Omit<GeneratedBrief, "markdown">): string {
  const palette = brief.palette.length
    ? brief.palette.map((c) => `\`${c}\``).join(" · ")
    : "(sem paleta declarada)";
  const tonePositive = brief.toneAdjectives.length
    ? brief.toneAdjectives.join(", ")
    : "(sem tom declarado)";
  const toneAvoid = brief.toneAvoid.length ? brief.toneAvoid.join(", ") : "—";
  const pillars = brief.pillars.length
    ? brief.pillars.map((p, i) => `${i + 1}. ${p}`).join("\n")
    : "—";

  const postsBlock = brief.posts
    .map(
      (post) =>
        `### Post ${post.index} — ${post.pillar}\n` +
        `- Hook: ${post.hook}\n` +
        `- Estrutura sugerida: ${post.cardsHint}\n` +
        `- CTA obrigatório: ${post.ctaReminder}\n`
    )
    .join("\n");

  return [
    `# Briefing Editorial · ${brief.clientDisplayName}`,
    ``,
    `**Tema:** ${brief.theme}`,
    `**Gerado em:** ${new Date(brief.generatedAt).toLocaleString("pt-BR")}`,
    `**Segmento:** ${brief.segmentLabel}`,
    ``,
    `## Contexto`,
    `- Objetivo: ${brief.goal}`,
    `- Público: ${brief.audience}`,
    ``,
    `## Tom`,
    `- Usar: ${tonePositive}`,
    `- Evitar: ${toneAvoid}`,
    ``,
    `## Paleta`,
    palette,
    ``,
    `## Pilares`,
    pillars,
    ``,
    `## Plano de ${brief.postsPerMonth} posts`,
    postsBlock,
    ``,
    `## Guia de hashtags`,
    brief.hashtagGuidance.map((line) => `- ${line}`).join("\n"),
    ``,
    `## Fluxo de aprovação`,
    brief.approvalFlow.join("\n"),
    ``,
    `## Saída`,
    `Salvar em \`${brief.outputDir}\`.`,
    ``
  ].join("\n");
}

export interface GenerateBriefInput {
  clientSlug: string;
  clientDisplayName: string;
  answers: ClientSetupAnswers;
  theme?: string;
  postsPerMonth?: number;
}

export function generateEditorialBrief(input: GenerateBriefInput): GeneratedBrief {
  const { clientSlug, clientDisplayName, answers } = input;
  const theme = input.theme?.trim() || DEFAULT_THEME;
  const postsPerMonth = Math.max(1, input.postsPerMonth ?? DEFAULT_POSTS_PER_MONTH);

  const partial: Omit<GeneratedBrief, "markdown"> = {
    clientSlug,
    clientDisplayName,
    generatedAt: Date.now(),
    theme,
    segmentLabel: segmentLabel(answers),
    goal: answers.goal,
    audience: answers.audience,
    pillars: [...answers.pillars],
    toneAdjectives: [...answers.toneAdjectives],
    toneAvoid: [...answers.toneAvoid],
    palette: [...answers.palette],
    cta: answers.cta,
    postsPerMonth,
    cardsPerPostHint: DEFAULT_CARDS_PER_POST,
    posts: buildPosts(answers, postsPerMonth),
    hashtagGuidance:
      SEGMENT_HASHTAG_GUIDANCE[answers.segment] ?? SEGMENT_HASHTAG_GUIDANCE.other!,
    approvalFlow: SEGMENT_APPROVAL_FLOW[answers.segment] ?? GENERIC_APPROVAL_FLOW,
    outputDir: `outputs/${answers.outputSlug}/${new Date()
      .toISOString()
      .slice(0, 7)}/`
  };

  return {
    ...partial,
    markdown: renderMarkdown(partial)
  };
}
