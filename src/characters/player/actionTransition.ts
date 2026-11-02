import type { AnimationAction } from 'three';
import type { GLBActionMap } from '../GLBCharacter';

/** Retoma o peso e o tempo atuais quando outra transição interrompe o crossfade.
 * fadeIn/fadeOut nativos reiniciam em 0/1; isso causa saltos com toques rápidos.
 * Entradas preparadas uma vez, sem alocação no quadro. */
export class ActionTransition {
  private readonly entries: { action: AnimationAction; from: number; to: number }[];
  private elapsed = 0;
  private duration = 0;
  private blending = false;

  constructor(actions: GLBActionMap) {
    this.entries = [...new Set(Object.values(actions).filter((action): action is AnimationAction => !!action))]
      .map(action => ({ action, from: 0, to: 0 }));
  }

  to(target: AnimationAction, duration: number, restart = false) {
    let total = 0;
    let incoming: (typeof this.entries)[number] | undefined;
    for (const entry of this.entries) {
      entry.from = entry.action.isScheduled() && entry.action.enabled ? entry.action.getEffectiveWeight() : 0;
      entry.to = entry.action === target ? 1 : 0;
      total += entry.from;
      if (entry.action === target) incoming = entry;
    }
    if (!incoming) return;
    // Reentrar durante o fade conserva a fase; ações pontuais continuam reiniciando.
    if (restart || incoming.from === 0) target.reset();
    target.play();
    this.elapsed = 0;
    this.duration = total > 0 ? Math.max(0, duration) : 0;
    this.blending = true;
    for (const entry of this.entries) entry.action.setEffectiveWeight(entry.from);
    if (this.duration === 0) this.update(0);
  }

  update(delta: number) {
    if (!this.blending) return;
    this.elapsed += Math.max(0, delta);
    const alpha = this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 1;
    for (const entry of this.entries) {
      entry.action.setEffectiveWeight(entry.from + (entry.to - entry.from) * alpha);
      if (alpha === 1 && entry.to === 0 && entry.action.isScheduled()) entry.action.stop();
    }
    this.blending = alpha < 1;
  }

  dispose() {
    for (const entry of this.entries) if (entry.action.isScheduled()) entry.action.stop();
  }
}
