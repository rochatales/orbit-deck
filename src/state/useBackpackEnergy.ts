import { create } from 'zustand';
import { BACKPACK } from '../game/backpackConfig';
export const backpackEnergy = { value: BACKPACK.energy.max as number };
/** Só a porcentagem inteira relevante para o HUD vai ao React. */
export const useBackpackEnergy = create(() => ({ percent: 100 }));
export function publishBackpackEnergy() {
  const percent = Math.round(backpackEnergy.value / BACKPACK.energy.max * 100);
  if (useBackpackEnergy.getState().percent !== percent) useBackpackEnergy.setState({ percent });
}
export function resetBackpackEnergy() {
  backpackEnergy.value = BACKPACK.energy.max;
  publishBackpackEnergy();
}
