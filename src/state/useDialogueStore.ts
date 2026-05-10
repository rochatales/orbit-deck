import { create } from "zustand";

interface DialogueState {
  activeNpcId: string | null;
  isOpen: boolean;
  openDialog: (npcId: string) => void;
  openConsole: (npcId: string) => void;
  closeDialog: () => void;
}

export const useDialogueStore = create<DialogueState>((set) => ({
  activeNpcId: null,
  isOpen: false,
  openDialog: (npcId) =>
    set({
      activeNpcId: npcId,
      isOpen: true
    }),
  openConsole: (npcId) =>
    set({
      activeNpcId: npcId,
      isOpen: true
    }),
  closeDialog: () =>
    set({
      activeNpcId: null,
      isOpen: false
    })
}));
