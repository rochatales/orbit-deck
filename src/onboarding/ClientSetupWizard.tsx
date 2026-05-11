import {
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CLIENT_SEGMENTS,
  generateRulesMd,
  isClientSetupValid,
  suggestOutputSlug,
  type ClientSegmentId,
  type ClientSetupAnswers
} from "../domain/clientSetupTemplate";
import { useClientSetupStore } from "../state/useClientSetupStore";
import { useWorkflowStore } from "../state/useWorkflowStore";

const TOTAL_STEPS = 7;

interface AnswersDraft {
  displayName: string;
  segment: ClientSegmentId | "";
  goal: string;
  audience: string;
  toneAdjectives: string[];
  toneAvoid: string[];
  pillars: string[];
  cta: string;
  outputSlug: string;
}

const EMPTY_DRAFT: AnswersDraft = {
  displayName: "",
  segment: "",
  goal: "",
  audience: "",
  toneAdjectives: [],
  toneAvoid: [],
  pillars: [],
  cta: "",
  outputSlug: ""
};

/**
 * Wizard de cadastro do primeiro cliente — conversa guiada com Eden.
 *
 * 7 passos curtos que produzem um `rules.md` completo no final.
 * O wizard só monta quando `useClientSetupStore.isWizardOpen` é true.
 */
export function ClientSetupWizard() {
  const isOpen = useClientSetupStore((s) => s.isWizardOpen);
  const closeWizard = useClientSetupStore((s) => s.closeWizard);
  const addClient = useClientSetupStore((s) => s.addClient);
  const completeTask = useWorkflowStore((s) => s.completeTask);
  const pushSystemNotification = useWorkflowStore((s) => s.pushSystemNotification);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AnswersDraft>(EMPTY_DRAFT);
  const [created, setCreated] = useState<{ slug: string; rulesMd: string } | null>(null);

  // Sempre que abre, reseta para o passo 0 com draft limpo.
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDraft(EMPTY_DRAFT);
      setCreated(null);
    }
  }, [isOpen]);

  // Sugestão automática do slug a partir do nome.
  useEffect(() => {
    if (!draft.outputSlug && draft.displayName.trim().length >= 2) {
      setDraft((d) => ({ ...d, outputSlug: suggestOutputSlug(d.displayName) }));
    }
  }, [draft.displayName, draft.outputSlug]);

  const validatedAnswers: ClientSetupAnswers | null = useMemo(() => {
    return isClientSetupValid(draft as Partial<ClientSetupAnswers>) ? (draft as unknown as ClientSetupAnswers) : null;
  }, [draft]);

  const previewMd = useMemo(() => {
    if (!validatedAnswers) return null;
    return generateRulesMd(validatedAnswers);
  }, [validatedAnswers]);

  if (!isOpen) return null;

  const stepValid = isStepValid(step, draft);
  const handleNext = () => {
    if (!stepValid) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleCreate = () => {
    if (!validatedAnswers || !previewMd) return;
    const id = `${validatedAnswers.outputSlug}-${Date.now()}`;
    const record = {
      id,
      slug: validatedAnswers.outputSlug,
      displayName: validatedAnswers.displayName,
      answers: validatedAnswers,
      rulesMd: previewMd,
      createdAt: Date.now()
    };
    addClient(record);
    completeTask("register-first-client");
    pushSystemNotification(
      "Cliente cadastrado",
      `${validatedAnswers.displayName} agora tem rules.md no Brand Brain.`,
      "complete"
    );
    setCreated({ slug: validatedAnswers.outputSlug, rulesMd: previewMd });
  };

  const handleDownload = () => {
    if (!created) return;
    const blob = new Blob([created.rulesMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${created.slug}-rules.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wizard-backdrop" role="dialog" aria-modal="true" aria-label="Cadastro de cliente com Eden">
      <div className="wizard-modal">
        <header className="wizard-header">
          <div className="wizard-eden">
            <span className="wizard-eden-avatar" aria-hidden="true">
              <Brain size={18} />
            </span>
            <div>
              <p className="wizard-eden-name">EDEN</p>
              <p className="wizard-eden-role">Brand Brain · Deck de Estratégia</p>
            </div>
          </div>
          <button
            type="button"
            className="wizard-close"
            onClick={closeWizard}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </header>

        {created ? (
          <SuccessStep
            slug={created.slug}
            rulesMd={created.rulesMd}
            onDownload={handleDownload}
            onClose={closeWizard}
          />
        ) : (
          <>
            <ProgressDots step={step} total={TOTAL_STEPS} />
            <div className="wizard-body">
              {step === 0 && <StepWelcome />}
              {step === 1 && <StepIdentity draft={draft} setDraft={setDraft} />}
              {step === 2 && <StepContext draft={draft} setDraft={setDraft} />}
              {step === 3 && <StepTone draft={draft} setDraft={setDraft} />}
              {step === 4 && <StepPillars draft={draft} setDraft={setDraft} />}
              {step === 5 && <StepCtaAndSlug draft={draft} setDraft={setDraft} />}
              {step === 6 && <StepReview draft={draft} previewMd={previewMd} />}
            </div>
            <footer className="wizard-footer">
              <button
                type="button"
                className="wizard-back-button"
                onClick={handleBack}
                disabled={step === 0}
              >
                <ChevronLeft size={14} /> Voltar
              </button>
              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  className="wizard-next-button"
                  onClick={handleNext}
                  disabled={!stepValid}
                >
                  Continuar <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="wizard-create-button"
                  onClick={handleCreate}
                  disabled={!validatedAnswers}
                >
                  <Sparkles size={14} /> Cadastrar e gerar rules.md
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Validação por passo
// -----------------------------------------------------------------------------

function isStepValid(step: number, d: AnswersDraft): boolean {
  switch (step) {
    case 0:
      return true;
    case 1:
      return d.displayName.trim().length >= 2 && d.segment !== "";
    case 2:
      return d.goal.trim().length >= 4 && d.audience.trim().length >= 4;
    case 3:
      return d.toneAdjectives.length >= 2 && d.toneAvoid.length >= 1;
    case 4:
      return d.pillars.length >= 3;
    case 5:
      return (
        d.cta.trim().length >= 8 &&
        d.outputSlug.trim().length >= 2 &&
        /^[a-z0-9-]+$/.test(d.outputSlug)
      );
    case 6:
      return isClientSetupValid(d as Partial<ClientSetupAnswers>);
    default:
      return false;
  }
}

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

function StepWelcome() {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Vamos cadastrar seu primeiro cliente?
      </p>
      <p className="wizard-helper">
        Em 6 perguntas curtas eu monto o <code>rules.md</code> deste cliente — o documento
        que vai guiar todos os outros agentes (Mister no Editorial, Max no Design, Nara
        na Narração e Astra no Social Media).
      </p>
      <p className="wizard-helper">
        Pode responder com calma. Se errar, dá pra voltar e ajustar.
      </p>
    </div>
  );
}

function StepIdentity({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Qual é o nome do cliente e em que segmento ele atua?
      </p>
      <label className="wizard-field">
        <span className="wizard-field-label">Nome da marca</span>
        <input
          type="text"
          className="wizard-input"
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
          placeholder="Ex: Hospital Samer"
          maxLength={64}
          autoFocus
        />
      </label>
      <label className="wizard-field">
        <span className="wizard-field-label">Segmento</span>
        <select
          className="wizard-input"
          value={draft.segment}
          onChange={(e) =>
            setDraft({ ...draft, segment: e.target.value as ClientSegmentId | "" })
          }
        >
          <option value="">Selecione…</option>
          {CLIENT_SEGMENTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function StepContext({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Em uma frase: qual é o objetivo principal de comunicação dessa marca, e quem é o público?
      </p>
      <label className="wizard-field">
        <span className="wizard-field-label">Objetivo de comunicação</span>
        <textarea
          className="wizard-input wizard-textarea"
          value={draft.goal}
          onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
          placeholder="Ex: Educar, gerar confiança e orientar pacientes."
          rows={2}
          maxLength={240}
          autoFocus
        />
      </label>
      <label className="wizard-field">
        <span className="wizard-field-label">Público-alvo principal</span>
        <textarea
          className="wizard-input wizard-textarea"
          value={draft.audience}
          onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
          placeholder="Ex: Pacientes, famílias, cuidadores e comunidade local."
          rows={2}
          maxLength={240}
        />
      </label>
    </div>
  );
}

function StepTone({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Como você descreveria o tom de voz dessa marca? E o que ela jamais deve fazer?
      </p>
      <ChipInput
        label="Adjetivos do tom (mínimo 2)"
        placeholder="Ex: claro, acolhedor, profissional"
        chips={draft.toneAdjectives}
        onChange={(chips) => setDraft({ ...draft, toneAdjectives: chips })}
      />
      <ChipInput
        label="O que evitar (mínimo 1)"
        placeholder="Ex: alarmismo, jargão técnico, vendas agressivas"
        chips={draft.toneAvoid}
        onChange={(chips) => setDraft({ ...draft, toneAvoid: chips })}
      />
    </div>
  );
}

function StepPillars({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Quais são os pilares de conteúdo desse cliente? Recomendo entre 3 e 5.
      </p>
      <ChipInput
        label="Pilares (mínimo 3)"
        placeholder="Ex: Educação em saúde, Orientação ao paciente, Estrutura hospitalar"
        chips={draft.pillars}
        onChange={(chips) => setDraft({ ...draft, pillars: chips })}
        helper="Pressione Enter ou vírgula para adicionar cada pilar."
      />
    </div>
  );
}

function StepCtaAndSlug({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Por fim: qual CTA padrão fecha as captions, e que slug usamos para organizar os arquivos?
      </p>
      <label className="wizard-field">
        <span className="wizard-field-label">CTA exato no fim das captions</span>
        <textarea
          className="wizard-input wizard-textarea"
          value={draft.cta}
          onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
          placeholder="Ex: Confira o link na bio. Fale com a Dora no whatsapp..."
          rows={3}
          maxLength={400}
          autoFocus
        />
      </label>
      <label className="wizard-field">
        <span className="wizard-field-label">Slug de pasta (apenas a-z, 0-9 e hífen)</span>
        <input
          type="text"
          className="wizard-input"
          value={draft.outputSlug}
          onChange={(e) => setDraft({ ...draft, outputSlug: e.target.value })}
          placeholder="hospital-samer"
          maxLength={48}
        />
        <span className="wizard-field-helper">
          Os arquivos vão ficar em <code>outputs/{draft.outputSlug || "slug"}/YYYY-MM/</code>
        </span>
      </label>
    </div>
  );
}

function StepReview({
  draft,
  previewMd
}: {
  draft: AnswersDraft;
  previewMd: string | null;
}) {
  return (
    <div className="wizard-step wizard-step-review">
      <p className="wizard-eden-bubble">
        Tudo certo? Confira o resumo e gere o rules.md.
      </p>
      <dl className="wizard-summary">
        <div>
          <dt>Marca</dt>
          <dd>{draft.displayName}</dd>
        </div>
        <div>
          <dt>Segmento</dt>
          <dd>{CLIENT_SEGMENTS.find((s) => s.id === draft.segment)?.label}</dd>
        </div>
        <div>
          <dt>Objetivo</dt>
          <dd>{draft.goal}</dd>
        </div>
        <div>
          <dt>Público</dt>
          <dd>{draft.audience}</dd>
        </div>
        <div>
          <dt>Tom</dt>
          <dd>{draft.toneAdjectives.join(", ")}</dd>
        </div>
        <div>
          <dt>Evitar</dt>
          <dd>{draft.toneAvoid.join(", ")}</dd>
        </div>
        <div>
          <dt>Pilares</dt>
          <dd>{draft.pillars.join(" · ")}</dd>
        </div>
        <div>
          <dt>CTA</dt>
          <dd>{draft.cta}</dd>
        </div>
        <div>
          <dt>Pasta</dt>
          <dd><code>outputs/{draft.outputSlug}/</code></dd>
        </div>
      </dl>
      {previewMd ? (
        <details className="wizard-preview">
          <summary>Pré-visualizar rules.md</summary>
          <pre className="wizard-preview-md">{previewMd}</pre>
        </details>
      ) : null}
    </div>
  );
}

function SuccessStep({
  slug,
  rulesMd,
  onDownload,
  onClose
}: {
  slug: string;
  rulesMd: string;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="wizard-step wizard-step-success">
      <div className="wizard-success-badge" aria-hidden="true">
        <Check size={28} strokeWidth={3} />
      </div>
      <h3 className="wizard-success-title">Cliente cadastrado.</h3>
      <p className="wizard-success-subtitle">
        Os agentes do escritório agora reconhecem este cliente. Você pode baixar o <code>rules.md</code> ou continuar a missão.
      </p>
      <details className="wizard-preview">
        <summary>Ver rules.md gerado ({slug})</summary>
        <pre className="wizard-preview-md">{rulesMd}</pre>
      </details>
      <div className="wizard-success-actions">
        <button type="button" className="wizard-back-button" onClick={onDownload}>
          <Download size={14} /> Baixar rules.md
        </button>
        <button type="button" className="wizard-create-button" onClick={onClose}>
          <Sparkles size={14} /> Continuar a missão
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-componentes
// -----------------------------------------------------------------------------

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="wizard-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`wizard-progress-dot${i === step ? " wizard-progress-dot-active" : ""}${i < step ? " wizard-progress-dot-done" : ""}`}
        />
      ))}
    </div>
  );
}

interface ChipInputProps {
  label: string;
  placeholder: string;
  chips: string[];
  onChange: (chips: string[]) => void;
  helper?: string;
}

function ChipInput({ label, placeholder, chips, onChange, helper }: ChipInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraftValue] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (!value) return;
    if (chips.includes(value)) {
      setDraftValue("");
      return;
    }
    onChange([...chips, value]);
    setDraftValue("");
  };

  const removeAt = (index: number) => {
    onChange(chips.filter((_, i) => i !== index));
  };

  return (
    <div className="wizard-field">
      <span className="wizard-field-label">{label}</span>
      <div className="wizard-chip-input">
        {chips.map((chip, i) => (
          <span key={`${chip}-${i}`} className="wizard-chip">
            {chip}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remover ${chip}`}
              className="wizard-chip-remove"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="wizard-chip-text"
          value={draft}
          placeholder={chips.length === 0 ? placeholder : ""}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
              removeAt(chips.length - 1);
            }
          }}
          onBlur={commit}
        />
      </div>
      {helper ? <span className="wizard-field-helper">{helper}</span> : null}
    </div>
  );
}
