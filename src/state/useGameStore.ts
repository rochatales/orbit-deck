import { create } from "zustand";

interface GameState {
  /**
   * Condição de interação publicada para a UI. A posição frequente do player fica
   * em `playerTransient.ts`, fora desta store; aqui só entram as mudanças de condição.
   */
  nearEden: boolean;
  nearShip: boolean;
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
  /** Publica a proximidade; não notifica assinantes quando nada mudou. */
  setProximity: (nearEden: boolean, nearShip: boolean) => void;
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

export const useGameStore = create<GameState>((set, get) => ({
  nearEden: false,
  nearShip: false,
  nearbyNpcId: null,
  targetZoom: 14,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: DEFAULT_MAX_ZOOM,
  targetRotation: Math.PI / 4,
  isPaused: false,
  controlsOpen: false,
  configOpen: false,
  setProximity: (nearEden, nearShip) => {
    const state = get();
    if (state.nearEden !== nearEden || state.nearShip !== nearShip) set({ nearEden, nearShip });
  },
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
