import { create } from "zustand";
import {
  CLIENT_PROFILES,
  getClientProfile,
  type ClientProfile,
} from "../domain/clientProfiles";
import { fetchClients } from "../api/mcpClient";

type ApiStatus = "idle" | "loading" | "ok" | "offline";

interface ClientSessionState {
  availableClients: ClientProfile[];
  selectedClientSlug: string | null;
  apiStatus: ApiStatus;
  selectClient: (slug: string) => void;
  clearSelectedClient: () => void;
  loadClientsFromApi: () => Promise<void>;
}

export const useClientSessionStore = create<ClientSessionState>((set, get) => ({
  availableClients: CLIENT_PROFILES,
  selectedClientSlug: null,
  apiStatus: "idle" as ApiStatus,

  selectClient: (slug) =>
    set(() => ({
      selectedClientSlug: getClientProfile(slug)?.slug ?? null,
    })),

  clearSelectedClient: () =>
    set({
      selectedClientSlug: null,
    }),

  loadClientsFromApi: async () => {
    // Skip if already loaded from API
    if (get().apiStatus === "ok" || get().apiStatus === "loading") {
      return;
    }

    set({ apiStatus: "loading" });

    try {
      const clients = await fetchClients();

      if (clients.length > 0) {
        set({
          availableClients: clients,
          apiStatus: "ok",
        });
        console.log(
          `[ClientSession] Loaded ${clients.length} clients from API`
        );
      } else {
        // API returned empty — keep local fallback
        set({ apiStatus: "offline" });
        console.warn(
          "[ClientSession] API returned empty, using local snapshot"
        );
      }
    } catch {
      // Server unreachable — keep local fallback
      set({ apiStatus: "offline" });
      console.warn(
        "[ClientSession] API unreachable, using local snapshot as fallback"
      );
    }
  },
}));
