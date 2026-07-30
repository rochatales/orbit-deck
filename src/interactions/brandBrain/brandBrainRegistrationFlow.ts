import {
  CLIENT_SEGMENTS,
  normalizePaletteValue,
  type ClientPostType,
  type ClientSegmentId,
  type ClientSetupAnswers
} from "../../domain/clientSetupTemplate";

export type BrandBrainRegistrationStepId =
  | "intro"
  | "identity"
  | "context"
  | "tone"
  | "palette"
  | "logo"
  | "pillars"
  | "cta"
  | "review"
  | "success";

export interface BrandBrainRegistrationDraft {
  displayName: string;
  segment: ClientSegmentId | "";
  goal: string;
  audience: string;
  monthlyEditorialVolume: number | "";
  postTypes: ClientPostType[];
  toneAdjectivesText: string;
  toneAvoidText: string;
  paletteText: string;
  logoDataUrl: string | null;
  pillarsText: string;
  cta: string;
  outputSlug: string;
}

export interface BrandBrainRegistrationStep {
  id: BrandBrainRegistrationStepId;
  speaker: "EDEN" | "PLAYER";
  prompt: string;
}

export const BRAND_BRAIN_REGISTRATION_STEPS: BrandBrainRegistrationStep[] = [
  {
    id: "intro",
    speaker: "EDEN",
    prompt: "Vamos cadastrar uma marca nova na sua estação. criativa."
  },
  {
    id: "identity",
    speaker: "EDEN",
    prompt: "Qual é o nome da marca e qual segmento ela habita?"
  },
  {
    id: "context",
    speaker: "EDEN",
    prompt: "Me conte objetivo, publico, volume mensal e formatos."
  },
  {
    id: "tone",
    speaker: "EDEN",
    prompt: "Agora calibramos voz: como falar e o que nunca fazer?"
  },
  {
    id: "palette",
    speaker: "EDEN",
    prompt: "Quais cores guiam essa marca? Hex, nomes ou tokens."
  },
  {
    id: "logo",
    speaker: "EDEN",
    prompt: "Tem logo agora? Se nao tiver, seguimos com placeholder."
  },
  {
    id: "pillars",
    speaker: "EDEN",
    prompt: "Liste os pilares editoriais. Tres ja acendem o nucleo."
  },
  {
    id: "cta",
    speaker: "EDEN",
    prompt: "Fechamento: CTA obrigatorio e slug de pasta."
  },
  {
    id: "review",
    speaker: "PLAYER",
    prompt: "Revise tudo. Se estiver certo, eu gero o rules.md."
  },
  {
    id: "success",
    speaker: "EDEN",
    prompt: "Marca registrada. Brand Brain pronto para os outros MCPs."
  }
];

export const EMPTY_BRAND_BRAIN_REGISTRATION_DRAFT: BrandBrainRegistrationDraft = {
  displayName: "",
  segment: "",
  goal: "",
  audience: "",
  monthlyEditorialVolume: "",
  postTypes: [],
  toneAdjectivesText: "",
  toneAvoidText: "",
  paletteText: "",
  logoDataUrl: null,
  pillarsText: "",
  cta: "",
  outputSlug: ""
};

export function splitListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function sanitizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function getSegmentLabel(segment: ClientSegmentId | "") {
  if (!segment) return "Nao definido";
  return CLIENT_SEGMENTS.find((option) => option.id === segment)?.label ?? segment;
}

export function getRegistrationStepValidation(
  stepId: BrandBrainRegistrationStepId,
  draft: BrandBrainRegistrationDraft
): string | null {
  switch (stepId) {
    case "intro":
    case "logo":
      return null;
    case "identity":
      if (draft.displayName.trim().length < 2) return "Nome da marca precisa ter pelo menos 2 caracteres.";
      if (!draft.segment) return "Escolha um segmento para a marca.";
      return null;
    case "context":
      if (draft.goal.trim().length < 4) return "Descreva o objetivo de comunicacao.";
      if (draft.audience.trim().length < 4) return "Descreva o publico principal.";
      if (
        typeof draft.monthlyEditorialVolume !== "number" ||
        draft.monthlyEditorialVolume < 1 ||
        draft.monthlyEditorialVolume > 120
      ) {
        return "Informe um volume entre 1 e 120 posts por mes.";
      }
      if (draft.postTypes.length < 1) return "Selecione pelo menos um formato de post.";
      return null;
    case "tone":
      if (splitListInput(draft.toneAdjectivesText).length < 2) return "Adicione pelo menos 2 adjetivos de tom.";
      if (splitListInput(draft.toneAvoidText).length < 1) return "Adicione pelo menos 1 item do que evitar.";
      return null;
    case "palette":
      if (splitListInput(draft.paletteText).length < 1) return "Adicione pelo menos 1 cor da marca.";
      return null;
    case "pillars":
      if (splitListInput(draft.pillarsText).length < 3) return "Adicione pelo menos 3 pilares editoriais.";
      return null;
    case "cta":
      if (draft.cta.trim().length < 8) return "O CTA precisa ter pelo menos 8 caracteres.";
      if (draft.outputSlug.trim().length < 2) return "Defina um slug de pasta.";
      if (!/^[a-z0-9-]+$/.test(draft.outputSlug)) return "Slug aceita apenas minusculas, numeros e hifen.";
      return null;
    case "review":
      return buildClientSetupAnswers(draft) ? null : "Ainda faltam respostas obrigatorias.";
    case "success":
      return null;
    default:
      return null;
  }
}

export function buildClientSetupAnswers(
  draft: BrandBrainRegistrationDraft
): ClientSetupAnswers | null {
  if (!draft.segment || typeof draft.monthlyEditorialVolume !== "number") return null;
  const answers: ClientSetupAnswers = {
    displayName: draft.displayName.trim(),
    segment: draft.segment,
    goal: draft.goal.trim(),
    audience: draft.audience.trim(),
    monthlyEditorialVolume: draft.monthlyEditorialVolume,
    postTypes: draft.postTypes,
    toneAdjectives: splitListInput(draft.toneAdjectivesText),
    toneAvoid: splitListInput(draft.toneAvoidText),
    pillars: splitListInput(draft.pillarsText),
    cta: draft.cta.trim(),
    outputSlug: draft.outputSlug.trim(),
    palette: splitListInput(draft.paletteText)
      .map((entry) => normalizePaletteValue(entry))
      .filter((entry): entry is string => Boolean(entry)),
    logoDataUrl: draft.logoDataUrl
  };
  return answers;
}

/**
 * Wrap a prompt into bubble-friendly lines.
 *
 * Default maxLineLength = 26 matches the Phase B bubble:
 *   canvas 240 px - (10 px padding × 2) = 220 px usable
 *   Press Start 2P at 8 px ~= 8 px per glyph
 *   220 / 8 = ~27 chars
 * We wrap at 26 to leave a safety pixel and avoid the last glyph
 * grazing the inner border.
 */
export function getDialogueLines(prompt: string, maxLineLength = 26) {
  const words = prompt.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 2);
}
