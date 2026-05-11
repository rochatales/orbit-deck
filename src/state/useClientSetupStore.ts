import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ClientSetupAnswers } from "../domain/clientSetupTemplate";

/**
 * Cliente cadastrado pelo player via conversa com Eden (Brand Brain).
 * Persiste no localStorage para sobreviver a reloads.
 */
export interface CustomClientRecord {
  id: string;
  slug: string;
  displayName: string;
  answers: ClientSetupAnswers;
  rulesMd: string;
  createdAt: number;
}

interface ClientSetupState {
  customClients: CustomClientRecord[];
  isWizardOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;
  addClient: (record: CustomClientRecord) => void;
  removeClient: (id: string) => void;
}

const PERSIST_KEY = "mcp-office:client-setup:v1";

export const useClientSetupStore = create<ClientSetupState>()(
  persist(
    (set) => ({
      customClients: [],
      isWizardOpen: false,
      openWizard: () => set({ isWizardOpen: true }),
      closeWizard: () => set({ isWizardOpen: false }),
      addClient: (record) =>
        set((state) => ({
          customClients: [...state.customClients, record]
        })),
      removeClient: (id) =>
        set((state) => ({
          customClients: state.customClients.filter((c) => c.id !== id)
        }))
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      // `isWizardOpen` é estado de UI; não persistimos.
      partialize: (state) => ({ customClients: state.customClients })
    }
  )
);

export function hasAnyCustomClient(state: ClientSetupState): boolean {
  return state.customClients.length > 0;
}
