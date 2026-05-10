import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DECK_REGISTRY, type DeckId, type ToolId } from "../domain/decks";

/**
 * Estágios da jornada do player.
 *
 * O app começa em `login` e só chega em `workspace` (a cena 3D) após o
 * player concluir a configuração inicial, escolher um deck e revisar
 * a etapa de conexão.
 */
export type JourneyStage =
  | "login"
  | "deck-selection"
  | "deck-connection"
  | "workspace";

export interface PlayerProfile {
  displayName: string;
  /** Cor do avatar do player (escolhida no login). */
  color: string;
  /** Timestamp do primeiro login — útil para telemetria de onboarding. */
  createdAt: number;
}

export type ToolConnectionStatus =
  | "disconnected"
  | "pending"
  | "connected"
  | "denied"
  | "error";

/** Estado de conexão por deck/ferramenta. */
export type DeckConnectionMap = Record<DeckId, Partial<Record<ToolId, ToolConnectionStatus>>>;

interface PlayerJourneyState {
  stage: JourneyStage;
  profile: PlayerProfile | null;
  selectedDeckId: DeckId | null;
  connections: DeckConnectionMap;

  // Transições de estágio.
  goToStage: (stage: JourneyStage) => void;
  loginAs: (input: { displayName: string; color: string }) => void;
  selectDeck: (deckId: DeckId) => void;
  enterWorkspace: () => void;
  resetJourney: () => void;
  signOut: () => void;
  /** Atualiza a cor do avatar sem sair da sessão atual. */
  updatePlayerColor: (color: string) => void;

  // Conexão de ferramentas (mock local — Fase 3 substitui por OAuth real).
  setToolStatus: (deckId: DeckId, toolId: ToolId, status: ToolConnectionStatus) => void;
  disconnectTool: (deckId: DeckId, toolId: ToolId) => void;
  getToolStatus: (deckId: DeckId, toolId: ToolId) => ToolConnectionStatus;
  /** Verdadeiro quando todas as ferramentas obrigatórias do deck estão `connected`. */
  isDeckReady: (deckId: DeckId) => boolean;
  /** Resumo `{required, connected}` para barras de progresso. */
  getDeckConnectionProgress: (deckId: DeckId) => { required: number; connected: number };
}

const DEFAULT_PLAYER_COLOR = "#66E6FF";

const emptyConnections: DeckConnectionMap = {
  "brand-brain": {},
  editorial: {},
  design: {},
  narration: {},
  "social-media": {}
};

export const PLAYER_COLOR_PRESETS: { id: string; label: string; value: string }[] = [
  { id: "cyan", label: "Cyan", value: "#66E6FF" },
  { id: "amber", label: "Amber", value: "#F2C94C" },
  { id: "violet", label: "Violet", value: "#9B51E0" },
  { id: "emerald", label: "Emerald", value: "#27AE60" },
  { id: "coral", label: "Coral", value: "#EF6F51" }
];

export const DEFAULT_JOURNEY_STAGE: JourneyStage = "login";
export const PLAYER_NAME_MAX_LENGTH = 32;
const PERSIST_KEY = "mcp-office:journey:v1";

export function isPlayerNameValid(name: string): boolean {
  return name.trim().length >= 2;
}

export const usePlayerJourneyStore = create<PlayerJourneyState>()(
  persist(
    (set, get) => ({
      stage: DEFAULT_JOURNEY_STAGE,
      profile: null,
      selectedDeckId: null,
      connections: emptyConnections,

      goToStage: (stage) => set({ stage }),

      loginAs: ({ displayName, color }) => {
        const cleanName = displayName.trim();
        if (!isPlayerNameValid(cleanName)) {
          // Salvaguarda — UI já bloqueia, mas o store também recusa.
          return;
        }
        const previous = get().profile;
        set({
          profile: {
            displayName: cleanName.slice(0, PLAYER_NAME_MAX_LENGTH),
            color: color || DEFAULT_PLAYER_COLOR,
            createdAt: previous?.createdAt ?? Date.now()
          },
          stage: "deck-selection"
        });
      },

      selectDeck: (deckId) =>
        set({
          selectedDeckId: deckId,
          stage: "deck-connection"
        }),

      enterWorkspace: () => {
        const { selectedDeckId, profile } = get();
        if (!profile) {
          // Sem profile, força login — nunca cair direto no mundo.
          set({ stage: "login" });
          return;
        }
        if (!selectedDeckId) {
          set({ stage: "deck-selection" });
          return;
        }
        set({ stage: "workspace" });
      },

      resetJourney: () =>
        set({
          stage: "deck-selection",
          selectedDeckId: null
        }),

      signOut: () =>
        set({
          stage: "login",
          profile: null,
          selectedDeckId: null,
          connections: emptyConnections
        }),

      updatePlayerColor: (color) =>
        set((state) =>
          state.profile
            ? { profile: { ...state.profile, color } }
            : state
        ),

      setToolStatus: (deckId, toolId, status) =>
        set((state) => ({
          connections: {
            ...state.connections,
            [deckId]: {
              ...state.connections[deckId],
              [toolId]: status
            }
          }
        })),

      disconnectTool: (deckId, toolId) =>
        set((state) => ({
          connections: {
            ...state.connections,
            [deckId]: {
              ...state.connections[deckId],
              [toolId]: "disconnected"
            }
          }
        })),

      getToolStatus: (deckId, toolId) =>
        get().connections[deckId]?.[toolId] ?? "disconnected",

      isDeckReady: (deckId) => {
        const deck = DECK_REGISTRY[deckId];
        if (!deck) return false;
        const deckConnections = get().connections[deckId] ?? {};
        return deck.tools
          .filter((tool) => tool.required)
          .every((tool) => deckConnections[tool.id] === "connected");
      },

      getDeckConnectionProgress: (deckId) => {
        const deck = DECK_REGISTRY[deckId];
        if (!deck) return { required: 0, connected: 0 };
        const deckConnections = get().connections[deckId] ?? {};
        const requiredTools = deck.tools.filter((t) => t.required);
        const connectedCount = requiredTools.filter(
          (t) => deckConnections[t.id] === "connected"
        ).length;
        return { required: requiredTools.length, connected: connectedCount };
      }
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      // Persistimos identidade e preferências; nunca persistimos `stage === workspace`,
      // assim o player nunca é jogado de volta na cena 3D sem passar pelo fluxo.
      partialize: (state) => ({
        profile: state.profile,
        selectedDeckId: state.selectedDeckId,
        connections: state.connections
      }),
      onRehydrateStorage: () => (rehydrated, error) => {
        if (error || !rehydrated) return;
        // Sem profile salvo => login. Com profile => caímos na seleção de deck,
        // pulando o login (já que a Etapa 1 já foi concluída antes).
        rehydrated.stage = rehydrated.profile ? "deck-selection" : "login";
      }
    }
  )
);
