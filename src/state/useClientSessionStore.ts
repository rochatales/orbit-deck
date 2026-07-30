import { create } from "zustand";

/**
 * Sessão de cliente — somente a seleção atual.
 *
 * A lista de clientes foi migrada para `useClientSetupStore` (clientes
 * cadastrados pelo player). As fixtures de `domain/clientProfiles.ts` agora
 * existem apenas como referência local em testes/desenvolvimento — nada é
 * carregado no runtime por aqui.
 *
 * Mantemos `loadClientsFromApi` como no-op para preservar o ponto de
 * extensão (Fase 3 vai voltar a sincronizar com o servidor).
 */

type ApiStatus = "idle" | "loading" | "ok" | "offline";

interface ClientSessionState {
  selectedClientSlug: string | null;
  apiStatus: ApiStatus;
  selectClient: (slug: string | null) => void;
  clearSelectedClient: () => void;
  loadClientsFromApi: () => Promise<void>;
}

export const useClientSessionStore = create<ClientSessionState>((set) => ({
  selectedClientSlug: null,
  apiStatus: "idle" as ApiStatus,

  selectClient: (slug) =>
    set(() => ({
      selectedClientSlug: slug
    })),

  clearSelectedClient: () =>
    set({
      selectedClientSlug: null
    }),

  // No-op por enquanto — a MVP usa exclusivamente os clientes cadastrados
  // pelo player via Eden. Mantemos o método para não quebrar o bootstrap.
  loadClientsFromApi: async () => {
    set({ apiStatus: "ok" });
  }
}));
