import { create } from "zustand";

interface MeetingState {
  /** True while the meeting beacon is on. Drives NPC pathing + chat panel. */
  isMeetingActive: boolean;
  /** True while the player capsule is inside the beacon's E-press radius.
   * InteractionManager reads this to suppress its 'no MCP nearby' notification
   * when the player is pressing E for the beacon instead of for a MCP. */
  isPlayerNearBeacon: boolean;
  /** Which MCP card is expanded inside the meeting chat panel. */
  selectedMcpId: string | null;

  toggleMeeting: () => void;
  setMeetingActive: (active: boolean) => void;
  setPlayerNearBeacon: (near: boolean) => void;
  selectMcp: (npcId: string | null) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  isMeetingActive: false,
  isPlayerNearBeacon: false,
  selectedMcpId: null,

  toggleMeeting: () =>
    set((state) => ({
      isMeetingActive: !state.isMeetingActive,
      // Reset the selected MCP when closing so the panel re-opens at the list view.
      selectedMcpId: !state.isMeetingActive ? state.selectedMcpId : null
    })),

  setMeetingActive: (active) =>
    set((state) => ({
      isMeetingActive: active,
      selectedMcpId: active ? state.selectedMcpId : null
    })),

  setPlayerNearBeacon: (near) => set({ isPlayerNearBeacon: near }),

  selectMcp: (npcId) => set({ selectedMcpId: npcId })
}));
