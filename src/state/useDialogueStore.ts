import { create } from "zustand";

/**
 * Modos do diálogo:
 *  - `console`    → console normal de ações do NPC.
 *  - `activation` → balão dedicado de ativação de deck. Aparece na primeira
 *                   interação com NPCs cujos decks ainda não foram ativados
 *                   na jornada do player. Confirmar o balão dispara
 *                   `activateDeck` e muda o modo para `console`.
 */
export type InteractionScreenId = "brand-brain";

export type DialogueMode = "console" | "activation" | "interaction-screen";

interface DialogueState {
  activeNpcId: string | null;
  isOpen: boolean;
  mode: DialogueMode;
  activeScreenId: InteractionScreenId | null;
  /**
   * Abre o console normal do NPC. Pode ser chamado direto ou no final do
   * fluxo de ativação (via `confirmActivation`).
   */
  openConsole: (npcId: string) => void;
  /**
   * Abre o balão de ativação para o NPC. Usado pelo `InteractionManager`
   * quando o player se aproxima de um NPC cujo deck ainda não foi ativado.
   */
  openActivationPrompt: (npcId: string) => void;
  openInteractionScreen: (npcId: string, screenId: InteractionScreenId) => void;
  /**
   * Encerra o balão de ativação e abre o console do mesmo NPC. Quem chama
   * é o componente da UI depois de disparar `activateDeck`.
   */
  confirmActivation: () => void;
  /**
   * Descarta o balão de ativação sem ativar o deck — mantém o jogador no
   * mundo, livre para sair e voltar depois.
   */
  dismissActivation: () => void;
  closeDialog: () => void;
}

export const useDialogueStore = create<DialogueState>((set, get) => ({
  activeNpcId: null,
  isOpen: false,
  mode: "console",
  activeScreenId: null,
  openConsole: (npcId) =>
    set({
      activeNpcId: npcId,
      isOpen: true,
      mode: "console",
      activeScreenId: null
    }),
  openActivationPrompt: (npcId) =>
    set({
      activeNpcId: npcId,
      isOpen: true,
      mode: "activation",
      activeScreenId: null
    }),
  openInteractionScreen: (npcId, screenId) =>
    set({
      activeNpcId: npcId,
      isOpen: true,
      mode: "interaction-screen",
      activeScreenId: screenId
    }),
  confirmActivation: () => {
    const { activeNpcId } = get();
    if (!activeNpcId) {
      // Sem NPC ativo, apenas garantimos um estado consistente.
      set({ isOpen: false, mode: "console", activeScreenId: null });
      return;
    }
    if (activeNpcId === "brand-brain") {
      set({ mode: "interaction-screen", activeScreenId: "brand-brain" });
      return;
    }
    set({ mode: "console", activeScreenId: null });
  },
  dismissActivation: () =>
    set({
      activeNpcId: null,
      isOpen: false,
      mode: "console",
      activeScreenId: null
    }),
  closeDialog: () =>
    set({
      activeNpcId: null,
      isOpen: false,
      mode: "console",
      activeScreenId: null
    })
}));
