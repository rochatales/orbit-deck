import {
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  CLIENT_SEGMENTS,
  CLIENT_POST_TYPES,
  generateRulesMd,
  isClientSetupValid,
  normalizePaletteValue,
  suggestOutputSlug,
  type ClientPostType,
  type ClientSegmentId,
  type ClientSetupAnswers
} from "../domain/clientSetupTemplate";
import { useClientSetupStore } from "../state/useClientSetupStore";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { useWorkflowStore } from "../state/useWorkflowStore";

const TOTAL_STEPS = 9;

const LOGO_MAX_BYTES = 1_500_000; // ~1.5MB — limite confortável para localStorage.

interface AnswersDraft {
  displayName: string;
  segment: ClientSegmentId | "";
  goal: string;
  audience: string;
  monthlyEditorialVolume: number | "";
  postTypes: ClientPostType[];
  toneAdjectives: string[];
  toneAvoid: string[];
  pillars: string[];
  cta: string;
  outputSlug: string;
  palette: string[];
  logoDataUrl: string | null;
}

const EMPTY_DRAFT: AnswersDraft = {
  displayName: "",
  segment: "",
  goal: "",
  audience: "",
  monthlyEditorialVolume: "",
  postTypes: [],
  toneAdjectives: [],
  toneAvoid: [],
  pillars: [],
  cta: "",
  outputSlug: "",
  palette: [],
  logoDataUrl: null
};

/**
 * Wizard de cadastro de cliente — conversa guiada com Eden.
 *
 * 7 passos curtos que produzem um `rules.md` completo no final.
 * O wizard só monta quando `useClientSetupStore.isWizardOpen` é true.
 */
export function ClientSetupWizard() {
  const isOpen = useClientSetupStore((s) => s.isWizardOpen);
  const closeWizard = useClientSetupStore((s) => s.closeWizard);
  const addClient = useClientSetupStore((s) => s.addClient);
  const pushSystemNotification = useWorkflowStore((s) => s.pushSystemNotification);
  const selectClient = useClientSessionStore((s) => s.selectClient);

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

  // Saída de emergência: ESC fecha o wizard. Mantemos o comportamento simples
  // e estável; o botão "Continuar" recebe foco automático na primeira etapa,
  // então Enter/Space já funcionam sem uma camada global extra de atalhos.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWizard();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeWizard]);

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
  const stepValidationMessage = getStepValidationMessage(step, draft);
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
    selectClient(record.slug);
    // "register-first-client" não está em workflowStore.initialTasks() — o
    // milestone de cadastro é coberto por "talk-brand-brain" na cena do
    // Brand Brain. Mantemos só a notificação de sucesso aqui.
    pushSystemNotification(
      "Cliente cadastrado",
      `${validatedAnswers.displayName} agora tem as regras da marca no Brand Brain.`,
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

  return createPortal(
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
              {step === 0 && <StepWelcome onStart={handleNext} />}
              {step === 1 && <StepIdentity draft={draft} setDraft={setDraft} />}
              {step === 2 && <StepContext draft={draft} setDraft={setDraft} />}
              {step === 3 && <StepTone draft={draft} setDraft={setDraft} />}
              {step === 4 && <StepPalette draft={draft} setDraft={setDraft} />}
              {step === 5 && <StepLogo draft={draft} setDraft={setDraft} />}
              {step === 6 && <StepPillars draft={draft} setDraft={setDraft} />}
              {step === 7 && <StepCtaAndSlug draft={draft} setDraft={setDraft} />}
              {step === 8 && <StepReview draft={draft} previewMd={previewMd} />}
            </div>
            {step > 0 ? (
              <footer className="wizard-footer">
                <>
                  <div className="wizard-footer-status" aria-live="polite">
                    {!stepValid && stepValidationMessage ? (
                      <span className="wizard-validation-chip wizard-validation-chip-error">
                        {stepValidationMessage}
                      </span>
                    ) : (
                      <span className="wizard-validation-chip wizard-validation-chip-ok">
                        {step < TOTAL_STEPS - 1
                          ? `Etapa ${step + 1} de ${TOTAL_STEPS}`
                          : "Pronto para gerar as regras da marca"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="wizard-back-button"
                    onClick={handleBack}
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
                      <Sparkles size={14} /> Cadastrar e gerar as regras da marca
                    </button>
                  )}
                </>
              </footer>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body
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
      return (
        d.goal.trim().length >= 4 &&
        d.audience.trim().length >= 4 &&
        typeof d.monthlyEditorialVolume === "number" &&
        d.monthlyEditorialVolume >= 1 &&
        d.postTypes.length >= 1
      );
    case 3:
      return d.toneAdjectives.length >= 2 && d.toneAvoid.length >= 1;
    case 4:
      return d.palette.length >= 1;
    case 5:
      // Logo é opcional — sempre válido. O player pode pular.
      return true;
    case 6:
      return d.pillars.length >= 3;
    case 7:
      return (
        d.cta.trim().length >= 8 &&
        d.outputSlug.trim().length >= 2 &&
        /^[a-z0-9-]+$/.test(d.outputSlug)
      );
    case 8:
      return isClientSetupValid(d as Partial<ClientSetupAnswers>);
    default:
      return false;
  }
}

function getStepValidationMessage(step: number, d: AnswersDraft): string | null {
  switch (step) {
    case 1:
      if (d.displayName.trim().length < 2 && d.segment === "") {
        return "Preencha o nome da marca e escolha o segmento para continuar.";
      }
      if (d.displayName.trim().length < 2) {
        return "Digite um nome de marca com pelo menos 2 caracteres.";
      }
      if (d.segment === "") {
        return "Escolha o segmento da marca para liberar o próximo passo.";
      }
      return null;
    case 2:
      if (
        d.goal.trim().length < 4 &&
        d.audience.trim().length < 4 &&
        (typeof d.monthlyEditorialVolume !== "number" || d.monthlyEditorialVolume < 1) &&
        d.postTypes.length < 1
      ) {
        return "Conte objetivo, público, volume mensal e formatos de post para continuar.";
      }
      if (d.goal.trim().length < 4) {
        return "Descreva o objetivo de comunicação com um pouco mais de contexto.";
      }
      if (d.audience.trim().length < 4) {
        return "Explique quem é o público principal desta marca.";
      }
      if (typeof d.monthlyEditorialVolume !== "number" || d.monthlyEditorialVolume < 1) {
        return "Informe quantos posts por mês o cliente precisa.";
      }
      if (d.postTypes.length < 1) {
        return "Selecione pelo menos 1 tipo de post para o MISTER planejar o editorial.";
      }
      return null;
    case 3:
      if (d.toneAdjectives.length < 2 && d.toneAvoid.length < 1) {
        return "Adicione pelo menos 2 adjetivos de tom e 1 item do que evitar.";
      }
      if (d.toneAdjectives.length < 2) {
        return "Adicione pelo menos 2 adjetivos para definir o tom de voz.";
      }
      if (d.toneAvoid.length < 1) {
        return "Liste pelo menos 1 comportamento ou linguagem a evitar.";
      }
      return null;
    case 4:
      return d.palette.length < 1 ? "Adicione pelo menos 1 cor da marca para continuar." : null;
    case 6:
      return d.pillars.length < 3 ? "Cadastre pelo menos 3 pilares de conteúdo." : null;
    case 7:
      if (d.cta.trim().length < 8 && d.outputSlug.trim().length < 2) {
        return "Preencha o CTA final e defina um slug de pasta.";
      }
      if (d.cta.trim().length < 8) {
        return "Escreva um CTA com pelo menos 8 caracteres.";
      }
      if (d.outputSlug.trim().length < 2) {
        return "Defina um slug de pasta com pelo menos 2 caracteres.";
      }
      if (!/^[a-z0-9-]+$/.test(d.outputSlug)) {
        return "O slug aceita apenas letras minúsculas, números e hífen.";
      }
      return null;
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

function StepWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Vamos cadastrar um cliente novo?
      </p>
      <p className="wizard-helper">
        Em 6 perguntas curtas eu monto <code>as regras da marca</code> deste cliente — o documento
        que vai guiar todos os outros agentes (Mister no Editorial, Max no Design, Nara
        na Narração e Astra no Social Media).
      </p>
      <p className="wizard-helper">
        Pode responder com calma. Se errar, dá pra voltar e ajustar.
      </p>
      <button
        type="button"
        className="wizard-create-button wizard-welcome-cta"
        onClick={onStart}
        autoFocus
      >
        Comecar cadastro <ChevronRight size={14} />
      </button>
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
      <div className="wizard-field">
        <span className="wizard-field-label">Volume editorial mensal</span>
        <input
          type="number"
          min={1}
          max={120}
          className="wizard-input"
          value={draft.monthlyEditorialVolume}
          onChange={(e) =>
            setDraft({
              ...draft,
              monthlyEditorialVolume:
                e.target.value === "" ? "" : Math.max(1, Number.parseInt(e.target.value, 10) || 1)
            })
          }
          placeholder="Ex: 12"
        />
        <span className="wizard-field-helper">
          Quantos posts o MISTER deve considerar por mês para esse cliente.
        </span>
      </div>
      <div className="wizard-field">
        <span className="wizard-field-label">Tipos de post</span>
        <div className="wizard-choice-grid" role="group" aria-label="Tipos de post">
          {CLIENT_POST_TYPES.map((option) => {
            const active = draft.postTypes.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={`wizard-choice-pill${active ? " wizard-choice-pill-active" : ""}`}
                onClick={() =>
                  setDraft({
                    ...draft,
                    postTypes: active
                      ? draft.postTypes.filter((type) => type !== option.id)
                      : [...draft.postTypes, option.id]
                  })
                }
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="wizard-field-helper">
          Escolha os formatos que esse cliente realmente publica: Estático, Carrossel e/ou Vídeo.
        </span>
      </div>
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

function StepPalette({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  const [draftColor, setDraftColor] = useState<string>("#000000");

  const addColor = (raw: string) => {
    const normalized = normalizePaletteValue(raw);
    if (!normalized) return;
    if (draft.palette.includes(normalized)) return;
    setDraft({ ...draft, palette: [...draft.palette, normalized] });
  };

  const removeAt = (index: number) => {
    setDraft({
      ...draft,
      palette: draft.palette.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Quais são as cores da marca? Adicione pelo menos uma.
      </p>
      <p className="wizard-helper">
        Cole hex codes (<code>#1A2B3C</code>) ou nomes de cor CSS. Eu uso isso
        no <strong>Brand Brain</strong> e o Max (Design) consome direto.
      </p>

      <div className="wizard-field">
        <span className="wizard-field-label">Paleta (mínimo 1)</span>
        <div className="wizard-palette-grid" role="list">
          {draft.palette.map((color, i) => (
            <span key={`${color}-${i}`} className="wizard-palette-chip" role="listitem">
              <span
                className="wizard-palette-swatch"
                style={{ background: color }}
                aria-hidden="true"
              />
              <code className="wizard-palette-code">{color}</code>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remover cor ${color}`}
                className="wizard-chip-remove"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="wizard-palette-add">
          <label className="wizard-palette-picker" aria-label="Selecionar cor">
            <span
              className="wizard-palette-picker-swatch"
              style={{ background: draftColor }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={draftColor}
              onChange={(e) => setDraftColor(e.target.value)}
              className="wizard-palette-picker-input"
            />
          </label>
          <input
            type="text"
            className="wizard-input wizard-palette-text"
            value={draftColor}
            onChange={(e) => setDraftColor(e.target.value)}
            placeholder="#1A2B3C, gold, rgb(20, 30, 40)…"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addColor(draftColor);
              }
            }}
          />
          <button
            type="button"
            className="wizard-next-button wizard-palette-add-button"
            onClick={() => addColor(draftColor)}
          >
            Adicionar
          </button>
        </div>
        <span className="wizard-field-helper">
          Pressione Enter ou clique em adicionar para inserir cada cor.
        </span>
      </div>
    </div>
  );
}

function StepLogo({
  draft,
  setDraft
}: {
  draft: AnswersDraft;
  setDraft: React.Dispatch<React.SetStateAction<AnswersDraft>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Arquivo precisa ser uma imagem.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(
        `Logo precisa ter no máximo ${Math.round(LOGO_MAX_BYTES / 1024)} KB. Reduza e tente novamente.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setError("Não consegui ler o arquivo. Tente outra imagem.");
        return;
      }
      setDraft({ ...draft, logoDataUrl: result });
    };
    reader.onerror = () => setError("Erro ao ler a imagem.");
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setDraft({ ...draft, logoDataUrl: null });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="wizard-step">
      <p className="wizard-eden-bubble">
        Tem um logo da marca? Pode subir agora (opcional).
      </p>
      <p className="wizard-helper">
        Aceito PNG, JPG ou SVG até 1.5 MB. Se você pular, o Max usa o placeholder
        <code> [ LOGO: {draft.displayName || "Marca"} ] </code>
        até a arte oficial chegar.
      </p>

      <div className="wizard-logo-zone">
        {draft.logoDataUrl ? (
          <div className="wizard-logo-preview">
            <img src={draft.logoDataUrl} alt="Logo enviado" className="wizard-logo-preview-img" />
            <button
              type="button"
              onClick={clearLogo}
              className="wizard-back-button"
              aria-label="Remover logo"
            >
              <Trash2 size={14} /> Remover
            </button>
          </div>
        ) : (
          <label className="wizard-logo-empty">
            <ImagePlus size={22} />
            <span>Clique para escolher um arquivo</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="wizard-logo-input"
            />
          </label>
        )}
      </div>

      {error ? <span className="wizard-field-error">{error}</span> : null}
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
        Tudo certo? Confira o resumo e gere as regras da marca.
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
          <dt>Volume mensal</dt>
          <dd>{draft.monthlyEditorialVolume || "-"} posts por mês</dd>
        </div>
        <div>
          <dt>Tipos de post</dt>
          <dd>
            {draft.postTypes.length > 0
              ? draft.postTypes
                  .map((type) => CLIENT_POST_TYPES.find((option) => option.id === type)?.label ?? type)
                  .join(" · ")
              : "-"}
          </dd>
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
          <dt>Paleta</dt>
          <dd>
            <span className="wizard-palette-summary">
              {draft.palette.map((color) => (
                <span key={color} className="wizard-palette-summary-chip">
                  <span
                    className="wizard-palette-summary-swatch"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <code>{color}</code>
                </span>
              ))}
            </span>
          </dd>
        </div>
        <div>
          <dt>Logo</dt>
          <dd>
            {draft.logoDataUrl ? (
              <img
                src={draft.logoDataUrl}
                alt="Logo enviado"
                className="wizard-logo-summary"
              />
            ) : (
              <span className="wizard-field-helper">Não enviado (usar placeholder)</span>
            )}
          </dd>
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
          <summary>Pré-visualizar as regras da marca</summary>
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
        Os agentes do escritório agora reconhecem este cliente. Você pode baixar <code>as regras da marca</code> ou continuar a missão.
      </p>
      <details className="wizard-preview">
        <summary>Ver as regras da marca geradas ({slug})</summary>
        <pre className="wizard-preview-md">{rulesMd}</pre>
      </details>
      <div className="wizard-success-actions">
        <button type="button" className="wizard-back-button" onClick={onDownload}>
          <Download size={14} /> Baixar as regras da marca
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
