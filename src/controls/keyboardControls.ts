import type { KeyboardControlsEntry } from "@react-three/drei";

/**
 * Contrato de movimento pela mira (S2.12; regra 4 do AGENTS.md): só avançar e recuar
 * movem o personagem. A/D e as setas laterais não têm ação de movimento; Shift não é
 * mais necessário (W já corre).
 */
export enum GameControl {
  Forward = "forward",
  Backward = "backward",
  Interact = "interact"
}

export const KEYBOARD_CONTROLS_MAP: KeyboardControlsEntry<GameControl>[] = [
  { name: GameControl.Forward, keys: ["KeyW", "ArrowUp"] },
  { name: GameControl.Backward, keys: ["KeyS", "ArrowDown"] },
  { name: GameControl.Interact, keys: ["KeyE"] }
];
