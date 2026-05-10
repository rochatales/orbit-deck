import type { KeyboardControlsEntry } from "@react-three/drei";

export enum GameControl {
  Forward = "forward",
  Backward = "backward",
  Leftward = "leftward",
  Rightward = "rightward",
  Interact = "interact"
}

export const KEYBOARD_CONTROLS_MAP: KeyboardControlsEntry<GameControl>[] = [
  { name: GameControl.Forward, keys: ["KeyW", "ArrowUp"] },
  { name: GameControl.Backward, keys: ["KeyS", "ArrowDown"] },
  { name: GameControl.Leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: GameControl.Rightward, keys: ["KeyD", "ArrowRight"] },
  { name: GameControl.Interact, keys: ["KeyE"] }
];
