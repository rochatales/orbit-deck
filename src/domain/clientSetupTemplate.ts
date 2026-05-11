/**
 * Geração do arquivo `rules.md` a partir das respostas da conversa com Eden
 * (Brand Brain). É uma função pura — sem dependência de UI, de fácil teste.
 *
 * Cobre 13 seções, alinhadas ao formato de referência do projeto.
 */

export type ClientSegmentId =
  | "healthcare"
  | "beauty"
  | "hospitality"
  | "education"
  | "real-estate"
  | "retail"
  | "services"
  | "technology"
  | "other";

export interface ClientSegmentOption {
  id: ClientSegmentId;
  label: string;
}

export const CLIENT_SEGMENTS: ClientSegmentOption[] = [
  { id: "healthcare", label: "Saúde / Hospitalar" },
  { id: "beauty", label: "Estética / Beleza" },
  { id: "hospitality", label: "Hotelaria / Pousada / Restaurante" },
  { id: "education", label: "Educação" },
  { id: "real-estate", label: "Imobiliário" },
  { id: "retail", label: "Varejo / E-commerce" },
  { id: "services", label: "Serviços profissionais" },
  { id: "technology", label: "Tecnologia / SaaS" },
  { id: "other", label: "Outro" }
];

export interface ClientSetupAnswers {
  displayName: string;
  segment: ClientSegmentId;
  goal: string;
  audience: string;
  toneAdjectives: string[];
  toneAvoid: string[];
  pillars: string[];
  cta: string;
  outputSlug: string;
}

interface SegmentDefaults {
  safetyRulesMd: string;
  visualHintMd: string;
  approvalFlowMd: string;
  monthlyMixMd: string;
  hashtagGuidanceMd: string;
}

const GENERIC_DEFAULTS: SegmentDefaults = {
  safetyRulesMd: [
    "- Evite afirmações que possam ser interpretadas como promessas absolutas.",
    "- Use linguagem responsável, factual e baseada em evidência sempre que possível.",
    "- Inclua disclaimers quando o tema for sensível.",
    "- Respeite direitos autorais, marca de terceiros e dados pessoais.",
    "- Prefira tom institucional a comercial agressivo."
  ].join("\n"),
  visualHintMd: [
    "- Prioritize layouts limpos e legíveis.",
    "- Use alto contraste para acessibilidade textual.",
    "- Mantenha overlays curtos e diretos.",
    "- Mantenha consistência de logo, cores e tipografia."
  ].join("\n"),
  approvalFlowMd: [
    "1. Revisão de social media (clareza e qualidade)",
    "2. Revisão de marca (identidade visual)",
    "3. Aprovação final de agendamento"
  ].join("\n"),
  monthlyMixMd: [
    "- 40% Educação / valor",
    "- 25% Orientação prática",
    "- 20% Conteúdo institucional",
    "- 15% Conversão / serviço"
  ].join("\n"),
  hashtagGuidanceMd: [
    "- Use poucas hashtags, somente quando fizerem sentido para o tema",
    "- Priorize hashtags institucionais e relacionadas ao tópico",
    "- Não exagere no volume de hashtags",
    "- Mantenha a seleção limpa e relevante"
  ].join("\n")
};

const SEGMENT_DEFAULTS: Record<ClientSegmentId, SegmentDefaults> = {
  healthcare: {
    ...GENERIC_DEFAULTS,
    safetyRulesMd: [
      "- Nunca prometer cura ou resultado garantido.",
      "- Nunca substituir consulta médica por orientação em redes sociais.",
      "- Nunca expor dados de pacientes (nomes, rostos, laudos) sem autorização legal explícita.",
      "- Evitar formato \"antes e depois\".",
      "- Preferir linguagem neutra e educativa.",
      "- Adicionar recomendação de avaliação profissional quando pertinente.",
      "",
      "Exemplos seguros:",
      "",
      "- \"Este conteúdo é educativo e não substitui avaliação médica.\"",
      "- \"Se os sintomas persistirem, procure atendimento.\""
    ].join("\n"),
    monthlyMixMd: [
      "- 40% Educação / prevenção",
      "- 25% Orientação ao paciente",
      "- 20% Conteúdo institucional de confiança",
      "- 15% Serviços / conversão"
    ].join("\n"),
    approvalFlowMd: [
      "1. Revisão de social media (clareza e qualidade)",
      "2. Revisão médica / compliance (temas sensíveis)",
      "3. Revisão de marca (identidade visual)",
      "4. Aprovação final de agendamento"
    ].join("\n")
  },
  beauty: {
    ...GENERIC_DEFAULTS,
    safetyRulesMd: [
      "- Não prometer resultado garantido para procedimentos estéticos.",
      "- Sempre informar que resultados variam por pessoa.",
      "- Não usar antes/depois sem autorização explícita do cliente final.",
      "- Não expor pele, rostos ou dados sensíveis sem termo de imagem.",
      "- Indicar avaliação profissional para qualquer procedimento.",
      "- Manter linguagem responsável e não comparativa."
    ].join("\n"),
    monthlyMixMd: [
      "- 35% Educação sobre cuidados",
      "- 25% Procedimentos e tecnologia",
      "- 20% Bastidores e equipe",
      "- 20% Conversão / agendamento"
    ].join("\n")
  },
  hospitality: {
    ...GENERIC_DEFAULTS,
    safetyRulesMd: [
      "- Não usar imagens de hóspedes sem autorização.",
      "- Confirmar disponibilidade real antes de prometer estrutura.",
      "- Manter linguagem acolhedora e objetiva sobre serviços.",
      "- Evitar comparações diretas com concorrentes."
    ].join("\n"),
    monthlyMixMd: [
      "- 40% Experiência e ambiente",
      "- 25% Roteiros e dicas locais",
      "- 20% Bastidores e equipe",
      "- 15% Reservas / conversão"
    ].join("\n")
  },
  education: {
    ...GENERIC_DEFAULTS,
    safetyRulesMd: [
      "- Não expor alunos sem autorização dos responsáveis.",
      "- Manter rigor factual em conteúdo educacional.",
      "- Citar fontes quando o tema demandar.",
      "- Evitar promessas de aprovação ou resultado garantido."
    ].join("\n"),
    monthlyMixMd: [
      "- 45% Conteúdo educacional",
      "- 25% Cultura institucional",
      "- 15% Cases e depoimentos",
      "- 15% Matrícula / conversão"
    ].join("\n")
  },
  "real-estate": {
    ...GENERIC_DEFAULTS,
    safetyRulesMd: [
      "- Sempre informar dados regulatórios obrigatórios (CRECI, etc).",
      "- Não prometer valorização garantida.",
      "- Manter transparência sobre condições de financiamento.",
      "- Evitar uso de fotos genéricas sem indicar quando o imóvel é representativo."
    ].join("\n"),
    monthlyMixMd: [
      "- 35% Conteúdo educativo (financiamento, mercado)",
      "- 30% Imóveis em destaque",
      "- 20% Orientação ao comprador",
      "- 15% Conversão direta"
    ].join("\n")
  },
  retail: GENERIC_DEFAULTS,
  services: GENERIC_DEFAULTS,
  technology: {
    ...GENERIC_DEFAULTS,
    monthlyMixMd: [
      "- 40% Educação técnica e tendências",
      "- 25% Cases e estudos",
      "- 20% Cultura e equipe",
      "- 15% Lançamentos e conversão"
    ].join("\n")
  },
  other: GENERIC_DEFAULTS
};

function defaultsFor(segment: ClientSegmentId): SegmentDefaults {
  return SEGMENT_DEFAULTS[segment] ?? GENERIC_DEFAULTS;
}

export function isClientSetupValid(answers: Partial<ClientSetupAnswers>): answers is ClientSetupAnswers {
  return Boolean(
    answers.displayName &&
      answers.displayName.trim().length >= 2 &&
      answers.segment &&
      answers.goal &&
      answers.goal.trim().length >= 4 &&
      answers.audience &&
      answers.audience.trim().length >= 4 &&
      answers.toneAdjectives &&
      answers.toneAdjectives.length >= 2 &&
      answers.toneAvoid &&
      answers.toneAvoid.length >= 1 &&
      answers.pillars &&
      answers.pillars.length >= 3 &&
      answers.cta &&
      answers.cta.trim().length >= 8 &&
      answers.outputSlug &&
      /^[a-z0-9-]+$/.test(answers.outputSlug)
  );
}

export function suggestOutputSlug(displayName: string): string {
  return displayName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Constrói o markdown final do rules.md para o cliente.
 */
export function generateRulesMd(answers: ClientSetupAnswers): string {
  const seg = defaultsFor(answers.segment);
  const segmentLabel =
    CLIENT_SEGMENTS.find((s) => s.id === answers.segment)?.label ?? answers.segment;

  const tonePositive = answers.toneAdjectives.map((t) => `- ${t}`).join("\n");
  const toneAvoid = answers.toneAvoid.map((t) => `- ${t}`).join("\n");
  const pillars = answers.pillars.map((p, i) => `${i + 1}. ${p}`).join("\n");
  const tonePhrase = answers.toneAdjectives.join(", ").toLowerCase();

  return `# ${answers.displayName} - Editorial Rules

This file defines the content rules for ${answers.displayName}.
Use these rules together with the master prompt.

---

## 1) Brand identity

- Brand name: **${answers.displayName}**
- Segment: ${segmentLabel}
- Main communication goal: ${answers.goal}
- Audience: ${answers.audience}

---

## 2) Tone of voice

${tonePositive}

Avoid:

${toneAvoid}

---

## 3) Content pillars

Use these pillars every month:

${pillars}

---

## 4) Safety and compliance rules

${seg.safetyRulesMd}

---

## 5) Visual style rules

${seg.visualHintMd}

---

## 6) Caption rules

All Instagram captions for ${answers.displayName} must follow these rules:

- Length: between 125 and 500 characters
- Style: a little more developed than a short caption, but still direct and easy to read
- Tone: ${tonePhrase}
- Focus: always connected to the exact theme of the post
- Purpose: inform, guide, raise awareness, or reinforce the brand promise
- Writing: natural, fluid, professional, and accessible

Important limits:

- Do not write empty or overly short captions
- Do not exceed 500 characters
- Do not use excessive emojis
- Do not use em dashes
- Do not use aggressive commercial language
- Do not invent information beyond the proposed theme

Mandatory closing:

Every caption must end with this exact CTA:

\`${answers.cta}\`

---

## 7) Recommended monthly mix

${seg.monthlyMixMd}

For every 4-post monthly editorial:

- Use only 1 commemorative or awareness date as the relevant date of the month
- The other posts should focus on evergreen topics aligned to the pillars

---

## 8) Hashtag guidance

${seg.hashtagGuidanceMd}

---

## 9) Final approval flow

Before publishing:

${seg.approvalFlowMd}

---

## 10) Output folder convention for this client

Always save files under:

\`outputs/${answers.outputSlug}/YYYY-MM/\`

Suggested files:

- \`overview.md\`
- \`posts-{N}-editorial.md\`

---

## 11) Document title convention

Every monthly file must use this exact title:

\`\`\`
${answers.displayName} editorial do mês [MÊS EM PORTUGUÊS] [ANO]
\`\`\`

Exemplos:
- \`${answers.displayName} editorial do mês Abril 2026\`
- \`${answers.displayName} editorial do mês Maio 2026\`

---

## 12) Logo and document header

- O arquivo de logo fica em: \`logos/${answers.outputSlug}/\`
- Nome padrão do arquivo: \`${answers.outputSlug}-logo.png\`
- Manter também uma versão para fundo escuro (se existir).
- Todo documento enviado ao Google Drive abre com um cabeçalho clean:

\`\`\`
[ LOGO: ${answers.displayName} ]
${answers.displayName} editorial do mês [MÊS] [ANO]
\`\`\`

  O designer substitui \`[ LOGO: ${answers.displayName} ]\` pela imagem real no Google Docs.
  O título \`${answers.displayName} editorial do mês [MÊS] [ANO]\` deve entrar como heading do documento.

---

## 13) Final document layout

- Every final Google Docs document must keep 1 post per page
- Each new post starts on a new page
- Maintain clean spacing between title, cards, caption, and hashtags
`;
}
