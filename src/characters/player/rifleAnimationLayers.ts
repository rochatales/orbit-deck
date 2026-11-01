import { AnimationClip, LoopOnce, LoopRepeat, PropertyBinding, type AnimationAction } from 'three';
import { COMBAT } from '../../combat/config';
import type { GLBActionMap } from '../GLBCharacter';
import type { PlayerAnimationState } from './playerConfig';

/** Máscaras criadas uma vez: Hips/pernas mantêm a passada; Spine e filhos operam a arma. */
export class RifleAnimationLayers {
  readonly legs: GLBActionMap;
  private readonly upper: GLBActionMap = {};
  private readonly clips: AnimationClip[] = [];
  private current: AnimationAction | null = null;
  private readonly mixer;
  private readonly root;
  private reloading = false;

  constructor(actions: GLBActionMap) {
    this.mixer = actions.Run!.getMixer();
    this.root = actions.Run!.getRoot();
    const spine = this.root.getObjectByName('mixamorig:Spine') ?? this.root.getObjectByName('mixamorigSpine');
    const names = new Set<string>();
    spine?.traverse(bone => names.add(PropertyBinding.sanitizeNodeName(bone.name)));
    if (!names.size) throw new Error('Astronauta sem Spine para separar tronco e pernas');
    const masked = (action: AnimationAction, upper: boolean, name: string) => {
      const source = action.getClip();
      const tracks = source.tracks.filter(track => names.has(PropertyBinding.sanitizeNodeName(PropertyBinding.parseTrackName(track.name).nodeName ?? '')) === upper);
      const clip = new AnimationClip(name, source.duration, tracks);
      this.clips.push(clip);
      return this.mixer.clipAction(clip, this.root);
    };
    this.legs = { ...actions };
    const backward = actions.Backward_Rifle ?? actions.Backward ?? actions.Run!;
    for (const [name, action] of [['Idle', actions.Aim_Rifle ?? actions.Idle], ['Run', actions.Run], ['Backward', backward]] as const) {
      if (action) {
        this.legs[name] = masked(action, false, name + '_Pernas');
        this.upper[name] = masked(action, true, name + '_Tronco');
      }
    }
    // O idle de combate também precisa da máscara; o clipe completo não concorre pelo tronco.
    this.legs.Aim_Rifle = this.legs.Idle;
    if (actions.Aim_Rifle) this.upper.Firing = masked(actions.Aim_Rifle, true, 'Firing_Rifle_Tronco');
    if (actions.Reload_Rifle) this.upper.Reload = masked(actions.Reload_Rifle, true, 'Reloading_Tronco');
  }

  update(state: PlayerAnimationState, reloadLeft: number, firing: boolean, base: AnimationAction | null, blocked: boolean) {
    if (blocked) return; // mixer e timer da simulação também estão suspensos.
    const reload = reloadLeft > 0;
    const special = state === 'dashing' || state === 'falling' || state === 'interacting' || state === 'actionTriggered';
    const target = special ? null : reload ? this.upper.Reload : firing ? this.upper.Firing :
      state === 'walking' ? this.upper.Run : state === 'backward' ? this.upper.Backward : this.upper.Idle;
    if (target !== this.current) {
      this.current?.fadeOut(.08);
      if (target) {
        target.reset();
        target.setLoop(reload ? LoopOnce : LoopRepeat, reload ? 1 : Infinity);
        target.clampWhenFinished = reload;
        target.fadeIn(.08).play();
      }
      this.current = target ?? null;
    }
    this.reloading = reload && !special;
    if (this.current) {
      if (this.reloading) {
        // Sincroniza com a recarga aceita pela simulação, sem atrasar/antecipar a munição.
        this.current.paused = true;
        this.current.time = this.current.getClip().duration * Math.max(0, Math.min(1, 1 - reloadLeft / COMBAT.rifle.reload));
      } else {
        this.current.timeScale = firing ? 1 : base?.timeScale ?? 1;
        if (!firing && base) this.current.time = base.time;
      }
    }
  }

  get upperAction() { return this.current; }

  dispose() {
    for (const clip of this.clips) {
      this.mixer.existingAction(clip, this.root)?.stop();
      this.mixer.uncacheAction(clip, this.root);
      this.mixer.uncacheClip(clip);
    }
  }
}
