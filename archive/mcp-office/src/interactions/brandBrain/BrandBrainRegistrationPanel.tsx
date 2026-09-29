import { useEffect, type ChangeEvent } from "react";
import {
  CLIENT_POST_TYPES,
  CLIENT_SEGMENTS,
  generateRulesMd,
  type ClientPostType
} from "../../domain/clientSetupTemplate";
import { useClientSessionStore } from "../../state/useClientSessionStore";
import { useClientSetupStore } from "../../state/useClientSetupStore";
import { useWorkflowStore } from "../../state/useWorkflowStore";
import {
  buildClientSetupAnswers,
  getRegistrationStepValidation,
  getSegmentLabel,
  sanitizeSlug,
  splitListInput,
  type BrandBrainRegistrationDraft,
  type BrandBrainRegistrationStep
} from "./brandBrainRegistrationFlow";

interface BrandBrainRegistrationPanelProps {
  draft: BrandBrainRegistrationDraft;
  onBack: () => void;
  onClose: () => void;
  onDraftChange: (draft: BrandBrainRegistrationDraft) => void;
  onNext: () => void;
  onSuccess: () => void;
  step: BrandBrainRegistrationStep;
  stepIndex: number;
  totalSteps: number;
}

const LOGO_MAX_BYTES = 1_500_000;

export function BrandBrainRegistrationPanel({
  draft,
  onBack,
  onClose,
  onDraftChange,
  onNext,
  onSuccess,
  step,
  stepIndex,
  totalSteps
}: BrandBrainRegistrationPanelProps) {
  const addClient = useClientSetupStore((state) => state.addClient);
  const selectClient = useClientSessionStore((state) => state.selectClient);
  const completeTask = useWorkflowStore((state) => state.completeTask);
  const pushSystemNotification = useWorkflowStore((state) => state.pushSystemNotification);
  const validation = getRegistrationStepValidation(step.id, draft);
  const canContinue = validation === null;
  const isReview = step.id === "review";
  const isSuccess = step.id === "success";

  useEffect(() => {
    if (draft.outputSlug || draft.displayName.trim().length < 2) return;
    const nextSlug = sanitizeSlug(draft.displayName);
    if (!nextSlug) return;
    onDraftChange({ ...draft, outputSlug: nextSlug });
  }, [draft, onDraftChange]);

  const update = (patch: Partial<BrandBrainRegistrationDraft>) => {
    onDraftChange({ ...draft, ...patch });
  };

  const submit = () => {
    if (!canContinue) return;
    if (isReview) {
      const answers = buildClientSetupAnswers(draft);
      if (!answers) return;
      const rulesMd = generateRulesMd(answers);
      const record = {
        id: `${answers.outputSlug}-${Date.now()}`,
        slug: answers.outputSlug,
        displayName: answers.displayName,
        answers,
        rulesMd,
        createdAt: Date.now()
      };
      addClient(record);
      selectClient(record.slug);
      // "register-first-client" não está em workflowStore.initialTasks() — a
      // missão de registro é coberta por "talk-brand-brain", que agora só
      // completa aqui (depois que o player confirma GERAR RULES na review).
      completeTask("talk-brand-brain");
      pushSystemNotification(
        "Cliente cadastrado",
        `${answers.displayName} agora tem rules.md no Brand Brain.`,
        "complete"
      );
      onSuccess();
      return;
    }
    if (isSuccess) {
      onClose();
      return;
    }
    onNext();
  };

  return (
    <div className="brand-brain-pixel-ui" aria-live="polite">
      <div className="brand-brain-pixel-topbar">
        <span>BRAND BRAIN // EDEN</span>
        {/*
          totalSteps já exclui o passo "success" (BRAND_BRAIN_REGISTRATION_STEPS
          tem 10 entradas e totalSteps = length - 1). Os indices interativos
          0..8 (intro..review) viram 1/9..9/9 naturalmente. No success a gente
          troca o contador por "PRONTO" para o player não achar que o registro
          já tinha terminado quando ainda estava na tela de review (9/9 com
          GERAR RULES).
        */}
        <span>{isSuccess ? "PRONTO" : `${stepIndex + 1}/${totalSteps}`}</span>
      </div>

      <div className="brand-brain-pixel-card">
        {renderStepFields(step.id, draft, update)}

        {validation ? <p className="brand-brain-pixel-validation">{validation}</p> : null}

        <footer className="brand-brain-pixel-actions">
          <button type="button" onClick={onBack} disabled={stepIndex === 0 || isSuccess}>
            VOLTAR
          </button>
          <button type="button" onClick={submit} disabled={!canContinue}>
            {isReview ? "GERAR RULES" : isSuccess ? "FECHAR" : "PROXIMO"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function renderStepFields(
  stepId: BrandBrainRegistrationStep["id"],
  draft: BrandBrainRegistrationDraft,
  update: (patch: Partial<BrandBrainRegistrationDraft>) => void
) {
  switch (stepId) {
    case "intro":
      return (
        <div className="brand-brain-pixel-copy">
          <strong>Novo Cadastro de Marca</strong>
          <span>Responda aqui e veja EDEN montar o documento da marca.</span>
          <span>Os seus agentes utilizaram essas regras depois.</span>
        </div>
      );
    case "identity":
      return (
        <>
          <PixelField label="Nome da marca">
            <input
              autoFocus
              value={draft.displayName}
              onChange={(event) => update({ displayName: event.target.value })}
              placeholder="Ex: Hospital Samer"
              maxLength={64}
            />
          </PixelField>
          <PixelField label="Segmento">
            <select
              value={draft.segment}
              onChange={(event) => update({ segment: event.target.value as BrandBrainRegistrationDraft["segment"] })}
            >
              <option value="">Selecione</option>
              {CLIENT_SEGMENTS.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.label}
                </option>
              ))}
            </select>
          </PixelField>
        </>
      );
    case "context":
      return (
        <>
          <PixelField label="Objetivo">
            <textarea
              autoFocus
              value={draft.goal}
              onChange={(event) => update({ goal: event.target.value })}
              placeholder="Educar, gerar confianca, converter..."
              rows={2}
            />
          </PixelField>
          <PixelField label="Publico">
            <textarea
              value={draft.audience}
              onChange={(event) => update({ audience: event.target.value })}
              placeholder="Pacientes, familias, gestores..."
              rows={2}
            />
          </PixelField>
          <div className="brand-brain-pixel-row">
            <PixelField label="Posts/mes">
              <input
                type="number"
                min={1}
                max={120}
                value={draft.monthlyEditorialVolume}
                onChange={(event) =>
                  update({
                    monthlyEditorialVolume:
                      event.target.value === ""
                        ? ""
                        : Math.max(1, Number.parseInt(event.target.value, 10) || 1)
                  })
                }
              />
            </PixelField>
            <div className="brand-brain-pixel-field">
              <span>Formatos</span>
              <div className="brand-brain-pixel-chip-grid">
                {CLIENT_POST_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={draft.postTypes.includes(type.id) ? "is-active" : ""}
                    onClick={() => togglePostType(type.id, draft, update)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      );
    case "tone":
      return (
        <>
          <PixelField label="Tom de voz">
            <textarea
              autoFocus
              value={draft.toneAdjectivesText}
              onChange={(event) => update({ toneAdjectivesText: event.target.value })}
              placeholder="claro, acolhedor, profissional"
              rows={2}
            />
          </PixelField>
          <PixelField label="Evitar">
            <textarea
              value={draft.toneAvoidText}
              onChange={(event) => update({ toneAvoidText: event.target.value })}
              placeholder="alarmismo, jargao, vendas agressivas"
              rows={2}
            />
          </PixelField>
        </>
      );
    case "palette":
      return (
        <PixelField label="Cores da marca">
          <textarea
            autoFocus
            value={draft.paletteText}
            onChange={(event) => update({ paletteText: event.target.value })}
            placeholder="#0b4f6c, #f5c542, branco"
            rows={4}
          />
        </PixelField>
      );
    case "logo":
      return <LogoField draft={draft} update={update} />;
    case "pillars":
      return (
        <PixelField label="Pilares editoriais">
          <textarea
            autoFocus
            value={draft.pillarsText}
            onChange={(event) => update({ pillarsText: event.target.value })}
            placeholder="Educacao, autoridade, bastidores"
            rows={4}
          />
        </PixelField>
      );
    case "cta":
      return (
        <>
          <PixelField label="CTA obrigatorio">
            <input
              autoFocus
              value={draft.cta}
              onChange={(event) => update({ cta: event.target.value })}
              placeholder="Agende sua avaliacao."
            />
          </PixelField>
          <PixelField label="Slug da pasta">
            <input
              value={draft.outputSlug}
              onChange={(event) => update({ outputSlug: sanitizeSlug(event.target.value) })}
              placeholder="hospital-samer"
            />
          </PixelField>
        </>
      );
    case "review":
      return <ReviewCard draft={draft} />;
    case "success":
      return (
        <div className="brand-brain-pixel-copy">
          <strong>rules.md gerado</strong>
          <span>Cliente salvo, Brand Brain ativo e pronto para a cadeia MCP.</span>
          <span>Volte ao mapa e fale com os proximos agentes.</span>
        </div>
      );
    default:
      return null;
  }
}

function PixelField({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="brand-brain-pixel-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function LogoField({
  draft,
  update
}: {
  draft: BrandBrainRegistrationDraft;
  update: (patch: Partial<BrandBrainRegistrationDraft>) => void;
}) {
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => update({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="brand-brain-pixel-copy">
      <strong>Logo opcional</strong>
      <span>Se nao tiver arquivo agora, pule. EDEN registra um placeholder.</span>
      <label className="brand-brain-pixel-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
        {draft.logoDataUrl ? "LOGO CARREGADO" : "CARREGAR LOGO"}
      </label>
    </div>
  );
}

function ReviewCard({ draft }: { draft: BrandBrainRegistrationDraft }) {
  return (
    <div className="brand-brain-pixel-review">
      <span>Marca: {draft.displayName || "..."}</span>
      <span>Segmento: {getSegmentLabel(draft.segment)}</span>
      <span>Volume: {draft.monthlyEditorialVolume || 0} posts/mes</span>
      <span>Formatos: {draft.postTypes.join(", ") || "..."}</span>
      <span>Cores: {splitListInput(draft.paletteText).join(", ") || "..."}</span>
      <span>Pilares: {splitListInput(draft.pillarsText).join(" / ") || "..."}</span>
    </div>
  );
}

function togglePostType(
  type: ClientPostType,
  draft: BrandBrainRegistrationDraft,
  update: (patch: Partial<BrandBrainRegistrationDraft>) => void
) {
  update({
    postTypes: draft.postTypes.includes(type)
      ? draft.postTypes.filter((entry) => entry !== type)
      : [...draft.postTypes, type]
  });
}
