import { MACHETE_COMBO } from '../../combat/melee';
import data from './swordClips.json';

/** Tabelas medidas nos FBX do autor por art-source/armas/facao/scripts/preparar_espada.py. */
export const SWORD_CLIPS = data;
/** Abaixo disso o corpo só gira pela mira; o clipe de 180° fica para viradas de verdade. */
export const SWORD_TURN_MIN_ANGLE = 130 * Math.PI / 180;

const cutOf = (stage: number) => SWORD_CLIPS.cuts[stage] ?? SWORD_CLIPS.cuts[0];
const timingOf = (stage: number) => MACHETE_COMBO[stage] ?? MACHETE_COMBO[0];

/** Tempo no clipe do combo: contato do corte coincide com o quadro de dano da simulação. */
export function comboClipTime(stage: number, left: number) {
  const { start, contact, end } = cutOf(stage), { interval, impact } = timingOf(stage);
  const elapsed = Math.min(interval, Math.max(0, interval - left));
  return elapsed <= impact
    ? start + (contact - start) * (elapsed / impact)
    : contact + (end - contact) * ((elapsed - impact) / (interval - impact));
}

/** Avanço do rastro no trecho rápido da lâmina (0 a 1); -1 fora dele. */
export function comboTrailProgress(stage: number, left: number) {
  if (left <= 0) return -1;
  const time = comboClipTime(stage, left), [from, to] = cutOf(stage).trail;
  return time < from || time > to ? -1 : (time - from) / (to - from);
}

function rootForwardAt(time: number) {
  const table = SWORD_CLIPS.rootForward, at = Math.min(table.length - 1, Math.max(0, time * SWORD_CLIPS.fps)), i = Math.min(table.length - 2, Math.floor(at));
  return table[i] + (table[i + 1] - table[i]) * (at - i);
}

/** Velocidade do passo do clipe (m/s): mantém o pé de apoio parado quando o jogador não anda. */
export function comboLungeSpeed(stage: number, left: number) {
  if (left <= 0) return 0;
  const step = 1 / 120, later = Math.max(0, left - step);
  return Math.max(0, (rootForwardAt(comboClipTime(stage, later)) - rootForwardAt(comboClipTime(stage, left))) / (left - later || step));
}

export const wrapAngle = (angle: number) => angle - Math.PI * 2 * Math.round(angle / (Math.PI * 2));

/** O clipe gira sempre para o mesmo lado; a virada percorre esse sentido até a mira. */
export function turnSweep(from: number, to: number) {
  const delta = wrapAngle(to - from);
  return delta > 0 ? delta - Math.PI * 2 : delta;
}

/** Rotação que ainda falta ao quadril do clipe no instante `time` (termina em zero). */
export function turnClipYaw(time: number) {
  const table = SWORD_CLIPS.turnYaw, at = Math.min(table.length - 1, Math.max(0, time * SWORD_CLIPS.fps)), i = Math.min(table.length - 2, Math.floor(at));
  return table[i] + (table[i + 1] - table[i]) * (at - i);
}

/**
 * Correção visual do corpo durante o giro. A física de mira continua livre; o que se vê sai
 * da orientação antiga e chega à mira no ritmo do clipe, qualquer que seja o ângulo pedido.
 */
export function turnBodyOffset(time: number, startFacing: number, sweep: number, facing: number) {
  const remaining = turnClipYaw(time), progress = 1 - remaining / SWORD_CLIPS.turnYaw[0];
  return wrapAngle(startFacing + sweep * progress - facing - remaining);
}
