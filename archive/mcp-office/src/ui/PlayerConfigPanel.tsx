import { motion } from "framer-motion";
import { Check, UserCog } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useGameStore } from "../state/useGameStore";
import {
  PLAYER_COLOR_PRESETS,
  PLAYER_NAME_MAX_LENGTH,
  isPlayerNameValid,
  usePlayerJourneyStore
} from "../state/usePlayerJourneyStore";

/**
 * Menu de configuração do player.
 *
 * Permite editar o nome e a cor do avatar a qualquer momento durante a sessão.
 * Salvamento atualiza o `usePlayerJourneyStore.profile`, então a preferência
 * persiste no localStorage automaticamente (via middleware persist).
 */
export function PlayerConfigPanel() {
  const configOpen = useGameStore((state) => state.configOpen);
  const closeAllPanels = useGameStore((state) => state.closeAllPanels);
  const profile = usePlayerJourneyStore((state) => state.profile);
  const loginAs = usePlayerJourneyStore((state) => state.loginAs);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [color, setColor] = useState(profile?.color ?? PLAYER_COLOR_PRESETS[0].value);
  const [savedTick, setSavedTick] = useState(0);

  // Sincroniza o formulário com o profile sempre que o painel abre
  // (evita exibir resíduos da última edição cancelada).
  useEffect(() => {
    if (configOpen && profile) {
      setDisplayName(profile.displayName);
      setColor(profile.color);
    }
  }, [configOpen, profile]);

  const trimmedName = displayName.trim();
  const nameValid = isPlayerNameValid(trimmedName);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return profile.displayName !== trimmedName || profile.color !== color;
  }, [profile, trimmedName, color]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nameValid || !dirty) return;
    loginAs({ displayName: trimmedName, color });
    setSavedTick((tick) => tick + 1);
  };

  if (!configOpen) return null;
  if (!profile) return null;

  return (
    <motion.section
      className="config-panel"
      role="dialog"
      aria-label="Configuração do player"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <header className="config-panel-header">
        <span className="panel-title">
          <UserCog size={16} />
          Configuração
        </span>
        <button
          type="button"
          className="dialog-close"
          onClick={closeAllPanels}
          aria-label="Fechar configuração"
        >
          ESC
        </button>
      </header>

      <form className="config-form" onSubmit={handleSubmit}>
        <label className="journey-field">
          <span className="journey-field-label">Nome do player</span>
          <input
            type="text"
            className={`journey-input${nameValid ? "" : " journey-input-invalid"}`}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            aria-invalid={!nameValid}
          />
          <span className="journey-field-hint">
            {trimmedName.length}/{PLAYER_NAME_MAX_LENGTH} caracteres
          </span>
        </label>

        <fieldset className="journey-field journey-fieldset">
          <legend className="journey-field-label">Cor do avatar</legend>
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
        </fieldset>

        <div className="config-form-footer">
          {savedTick > 0 && !dirty ? (
            <span className="config-saved-pill" key={savedTick}>
              <Check size={14} /> Salvo
            </span>
          ) : (
            <span className="journey-field-hint">As mudanças ficam salvas neste dispositivo.</span>
          )}
          <button
            type="submit"
            className="journey-primary-button config-save-button"
            disabled={!nameValid || !dirty}
          >
            Salvar
          </button>
        </div>
      </form>
    </motion.section>
  );
}
