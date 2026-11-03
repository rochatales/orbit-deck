import { AnimationClip, LoopOnce, LoopRepeat, PropertyBinding, type AnimationAction } from 'three';
import { MACHETE } from '../../combat/melee';
import type { GLBActionMap } from '../GLBCharacter';
import type { PlayerAnimationState } from './playerConfig';

/** Tronco executa o corte; pernas conservam marcha/recuo sem parar a física. */
export class MacheteAnimationLayers {
  readonly legs: GLBActionMap;
  private upper: GLBActionMap = {};
  private current: AnimationAction | null = null;
  private clips: AnimationClip[] = [];
  private mixer;
  private root;
  private lastSwing = -1;
  constructor(actions: GLBActionMap) {
    this.mixer = actions.Run!.getMixer(); this.root = actions.Run!.getRoot();
    const spine = this.root.getObjectByName('mixamorigSpine') ?? this.root.getObjectByName('mixamorig:Spine');
    const names = new Set<string>(); spine?.traverse(n => names.add(PropertyBinding.sanitizeNodeName(n.name)));
    const masked = (action: AnimationAction, upper: boolean, name: string) => {
      const clip = new AnimationClip(name, action.getClip().duration, action.getClip().tracks.filter(t => names.has(PropertyBinding.sanitizeNodeName(PropertyBinding.parseTrackName(t.name).nodeName ?? '')) === upper));
      this.clips.push(clip); return this.mixer.clipAction(clip, this.root);
    };
    this.legs = { ...actions };
    for (const [name, source] of [['Idle', actions.Machete_Idle], ['Run', actions.Machete_Run], ['Backward', actions.Machete_Backward]] as const) {
      if (source) { this.legs[name] = masked(source, false, name + '_Facao_Pernas'); this.upper[name] = masked(source, true, name + '_Facao_Tronco'); }
    }
    this.legs.Aim_Rifle = this.legs.Idle;
    if (actions.Machete_Slash) this.upper.Slash = masked(actions.Machete_Slash, true, 'Facao_Corte_Tronco');
  }
  update(state: PlayerAnimationState, left: number, swingId: number, base: AnimationAction | null, blocked: boolean) {
    if (blocked) return;
    const special = state === 'dashing' || state === 'falling' || state === 'interacting' || state === 'actionTriggered';
    const slash = left > 0 && !special;
    const target = special ? null : slash ? this.upper.Slash : state === 'walking' ? this.upper.Run : state === 'backward' ? this.upper.Backward : this.upper.Idle;
    if (target !== this.current || (slash && swingId !== this.lastSwing)) {
      this.current?.fadeOut(.06);
      if (target) { target.reset(); target.setLoop(slash ? LoopOnce : LoopRepeat, slash ? 1 : Infinity); target.clampWhenFinished = slash; target.fadeIn(.06).play(); }
      this.current = target ?? null;
    }
    this.lastSwing = swingId;
    if (this.current) {
      this.current.paused = slash;
      if (slash) this.current.time = this.current.getClip().duration * Math.min(1, Math.max(0, 1 - left / MACHETE.interval));
      else if (base) { this.current.timeScale = base.timeScale; this.current.time = base.time; }
    }
  }
  get upperAction() { return this.current; }
  dispose() {
    for (const clip of this.clips) { this.mixer.existingAction(clip, this.root)?.stop(); this.mixer.uncacheAction(clip, this.root); this.mixer.uncacheClip(clip); }
  }
}
