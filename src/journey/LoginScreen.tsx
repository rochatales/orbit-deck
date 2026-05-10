import { useMemo, useState, type FormEvent } from "react";
import {
  PLAYER_COLOR_PRESETS,
  PLAYER_NAME_MAX_LENGTH,
  isPlayerNameValid,
  usePlayerJourneyStore
} from "../state/usePlayerJourneyStore";

const WELCOME_HEADLINE = "Bem-vindo a sua estação criativa.";
const WELCOME_SUBTITLE = "Escolha um deck para começar.";

export function LoginScreen() {
  const loginAs = usePlayerJourneyStore((state) => state.loginAs);
  const existingProfile = usePlayerJourneyStore((state) => state.profile);

  const [displayName, setDisplayName] = useState(existingProfile?.displayName ?? "");
  const [color, setColor] = useState(existingProfile?.color ?? PLAYER_COLOR_PRESETS[0].value);
  const [touched, setTouched] = useState(false);

  const isReturning = Boolean(existingProfile);
  const trimmedName = displayName.trim();
  const nameValid = isPlayerNameValid(trimmedName);
  const showNameError = touched && !nameValid;

  const selectedSwatch = useMemo(
    () => PLAYER_COLOR_PRESETS.find((preset) => preset.value === color) ?? PLAYER_COLOR_PRESETS[0],
    [color]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!nameValid) return;
    loginAs({ displayName: trimmedName, color });
  };

  return (
    <div className="journey-stage journey-stage-login">
      <div className="login-shell">
        <header className="brand-mark" aria-label="MCP Office — estação criativa">
          <span className="brand-mark-glyph" aria-hidden="true">
            <span className="brand-mark-dot" style={{ background: color }} />
          </span>
          <span className="brand-mark-text">
            <span className="brand-mark-name">MCP Office</span>
            <span className="brand-mark-tagline">estação criativa</span>
          </span>
        </header>

        <div className="login-grid">
          <section className="login-hero">
            <p className="journey-kicker">Etapa 1 · Configuração inicial</p>
            <h1 className="login-hero-title">{WELCOME_HEADLINE}</h1>
            <p className="login-hero-subtitle">{WELCOME_SUBTITLE}</p>

            <ol className="login-stepper" aria-label="Etapas da jornada">
              <li className="login-step login-step-active">
                <span className="login-step-index">1</span>
                <span className="login-step-label">Configurar player</span>
              </li>
              <li className="login-step">
                <span className="login-step-index">2</span>
                <span className="login-step-label">Escolher deck</span>
              </li>
              <li className="login-step">
                <span className="login-step-index">3</span>
                <span className="login-step-label">Conectar ferramentas</span>
              </li>
              <li className="login-step">
                <span className="login-step-index">4</span>
                <span className="login-step-label">Entrar no escritório</span>
              </li>
            </ol>
          </section>

          <section className="journey-card login-form-card" aria-labelledby="login-form-title">
            <h2 id="login-form-title" className="login-form-title">
              {isReturning ? `Continuar como ${existingProfile?.displayName}?` : "Configure seu player"}
            </h2>
            <p className="login-form-hint">
              {isReturning
                ? "Os dados desta sessão ficaram salvos neste dispositivo. Ajuste o que precisar e siga em frente."
                : "Defina seu nome e cor antes de seguir para a seleção de deck."}
            </p>

            <form className="journey-form" onSubmit={handleSubmit} noValidate>
              <label className="journey-field">
                <span className="journey-field-label">Como devemos te chamar?</span>
                <input
                  type="text"
                  className={`journey-input${showNameError ? " journey-input-invalid" : ""}`}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Ex: Tales"
                  autoFocus
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  aria-invalid={showNameError}
                  aria-describedby={showNameError ? "login-name-error" : undefined}
                />
                {showNameError ? (
                  <span id="login-name-error" className="journey-field-error">
                    Use pelo menos 2 caracteres para identificar seu player.
                  </span>
                ) : (
                  <span className="journey-field-hint">
                    {trimmedName.length}/{PLAYER_NAME_MAX_LENGTH} caracteres
                  </span>
                )}
              </label>

              <fieldset className="journey-field journey-fieldset">
                <legend className="journey-field-label">Cor do seu avatar</legend>
                <div className="journey-color-grid" role="radiogroup" aria-label="Cor do avatar">
                  {PLAYER_COLOR_PRESETS.map((preset) => {
                    const selected = preset.value === color;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        role="radio"
                        aria-checked={selected}
                        aria-label={preset.label}
                        className={`journey-color-swatch${selected ? " journey-color-swatch-selected" : ""}`}
                        style={{ background: preset.value }}
                        onClick={() => setColor(preset.value)}
                        title={preset.label}
                      />
                    );
                  })}
                </div>
                <span className="journey-field-hint">
                  Selecionado: <strong>{selectedSwatch.label}</strong>
                </span>
              </fieldset>

              <button
                type="submit"
                className="journey-primary-button"
                disabled={!nameValid}
                title={
                  nameValid
                    ? "Avançar para a seleção de deck"
                    : "Configure seu nome para liberar a próxima etapa"
                }
              >
                {isReturning ? "Continuar" : "Entrar na estação"}
              </button>
              <p className="login-form-footnote">Sua sessão fica salva neste dispositivo.</p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
