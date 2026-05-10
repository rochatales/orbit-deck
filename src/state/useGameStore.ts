import { create } from "zustand";

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

interface GameState {
  playerPosition: WorldPosition;
  nearbyNpcId: string | null;
  targetZoom: number;
  minZoom: number;
  maxZoom: number;
  targetRotation: number;
  isPaused: boolean;
  /** Painel de controles (câmera, atalhos e teclado). */
  controlsOpen: boolean;
  /** Painel de configuração do player (nome, cor do avatar). */
  configOpen: boolean;
  setPlayerPosition: (position: WorldPosition) => void;
  setNearbyNpcId: (npcId: string | null) => void;
  adjustZoom: (delta: number) => void;
  setZoom: (zoom: number) => void;
  setZoomBounds: (minZoom: number, maxZoom: number) => void;
  rotateCamera: (delta: number) => void;
  togglePaused: () => void;
  toggleControls: () => void;
  toggleConfig: () => void;
  closeAllPanels: () => void;
}

const DEFAULT_MIN_ZOOM = 0.3;
const DEFAULT_MAX_ZOOM = 120;

export const useGameStore = create<GameState>((set) => ({
  playerPosition: { x: 0, y: 0, z: 0.8 },
  nearbyNpcId: null,
  targetZoom: 14,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: DEFAULT_MAX_ZOOM,
  targetRotation: Math.PI / 4,
  isPaused: false,
  controlsOpen: false,
  configOpen: false,
  setPlayerPosition: (position) => set({ playerPosition: position }),
  setNearbyNpcId: (npcId) => set({ nearbyNpcId: npcId }),
  adjustZoom: (delta) =>
    set((state) => ({
      targetZoom: Math.min(state.maxZoom, Math.max(state.minZoom, state.targetZoom + delta))
    })),
  setZoom: (zoom) =>
    set((state) => ({
      targetZoom: Math.min(state.maxZoom, Math.max(state.minZoom, zoom))
    })),
  setZoomBounds: (minZoom, maxZoom) =>
    set((state) => ({
      minZoom,
      maxZoom,
      targetZoom: Math.min(maxZoom, Math.max(minZoom, state.targetZoom))
    })),
  rotateCamera: (delta) =>
    set((state) => ({
      targetRotation: state.targetRotation + delta
    })),
  togglePaused: () =>
    set((state) => ({
      isPaused: !state.isPaused
    })),
  toggleControls: () =>
    set((state) => ({
      controlsOpen: !state.controlsOpen,
      // Garante que apenas um painel da barra fica aberto por vez.
      configOpen: false
    })),
  toggleConfig: () =>
    set((state) => ({
      configOpen: !state.configOpen,
      controlsOpen: false
    })),
  closeAllPanels: () =>
    set({
      controlsOpen: false,
      configOpen: false
    })
}));
