import { AnimationClip, PropertyBinding, Quaternion, LoopRepeat, type AnimationAction } from 'three';
import type { GLBActionMap } from '../GLBCharacter';
import type { PlayerAnimationState } from './playerConfig';
import { SWORD_CLIPS, SWORD_TURN_MIN_ANGLE, comboClipTime, turnBodyOffset, turnSweep, wrapAngle } from './swordClips';

const trackBone = (name: string) => PropertyBinding.sanitizeNodeName(PropertyBinding.parseTrackName(name).nodeName ?? '');

/**
 * Fecha o ciclo: a última pose do `Machete_Backward` não bate com a primeira e dava um tranco de
 * 3 cm na cabeça a cada passada. Dilui a diferença nos últimos quadros; o resto do clipe não muda.
 */
export function weldLoop(clip: AnimationClip, keys = 5) {
  const out = clip.clone(), a = new Quaternion(), b = new Quaternion();
  for (const track of out.tracks) {
    const size = track.getValueSize(), count = track.times.length, values = track.values;
    if (count <= keys) continue;
    for (let k = 1; k <= keys; k++) {
      const at = (count - 1 - keys + k) * size, weight = k / keys;
      if (size === 4) {
        a.fromArray(values, at); b.fromArray(values, 0);
        a.slerp(b, weight).toArray(values, at);
      } else for (let c = 0; c < size; c++) values[at + c] += (values[c] - values[at + c]) * weight;
    }
  }
  return out;
}

/** Golpes usam o corpo todo, inclusive em movimento; a física continua conduzida pela mira. */
export class MacheteAnimationLayers {
  readonly legs: GLBActionMap;
  private upper: GLBActionMap = {};
  private current: AnimationAction | null = null;
  private clips: AnimationClip[] = [];
  private mixer;
  private root;
  private special: 'death' | 'turn' | null = null;
  private clock = 0;
  private turnFrom = 0;
  private turnWay = 0;
  /** Correção do corpo no giro; lida pelo PlayerModel. */
  bodyYaw = 0;
  constructor(actions: GLBActionMap) {
    this.mixer = actions.Run!.getMixer(); this.root = actions.Run!.getRoot();
    const spine = this.root.getObjectByName('mixamorigSpine') ?? this.root.getObjectByName('mixamorig:Spine');
    const names = new Set<string>(); spine?.traverse(n => names.add(PropertyBinding.sanitizeNodeName(n.name)));
    const action = (clip: AnimationClip) => { this.clips.push(clip); return this.mixer.clipAction(clip, this.root); };
    const maskedClip = (source: AnimationClip, upper: boolean, name: string) =>
      action(new AnimationClip(name, source.duration, source.tracks.filter(t => names.has(trackBone(t.name)) === upper)));
    const masked = (source: AnimationAction, upper: boolean, name: string) => maskedClip(source.getClip(), upper, name);
    this.legs = { ...actions };
    for (const [name, source] of [['Idle', actions.Machete_Idle], ['Run', actions.Machete_Run]] as const) {
      if (source) { this.legs[name] = masked(source, false, name + '_Facao_Pernas'); this.upper[name] = masked(source, true, name + '_Facao_Tronco'); }
    }
    if (actions.Machete_Backward) {
      const welded = weldLoop(actions.Machete_Backward.getClip());
      this.legs.Backward = maskedClip(welded, false, 'Backward_Facao_Pernas'); this.upper.Backward = maskedClip(welded, true, 'Backward_Facao_Tronco');
    }
    this.legs.Aim_Rifle = this.legs.Idle;
    for (const [name, source] of [['Slash', actions.Sword_Combo], ['Turn', actions.Sword_Turn], ['Death', actions.Sword_Death]] as const) {
      if (source) { this.legs[name] = masked(source, false, name + '_Espada_Pernas'); this.upper[name] = masked(source, true, name + '_Espada_Tronco'); }
    }
  }
  /** Decide morte e giro antes da escolha das pernas; pausa não avança o relógio. */
  prepare(state: PlayerAnimationState, facing: number, aim: number, left: number, dead: boolean, delta: number, blocked: boolean) {
    if (dead) {
      if (this.special !== 'death' && this.legs.Death) { this.special = 'death'; this.clock = 0; this.bodyYaw = 0; }
      else this.clock = Math.min(SWORD_CLIPS.deathDuration, this.clock + delta);
      return;
    }
    if (this.special === 'death') { this.special = null; this.clock = 0; }
    if (blocked) return;
    if (this.special === 'turn' && (state !== 'idle' || left > 0 || this.clock >= SWORD_CLIPS.turnDuration)) this.special = null;
    else if (this.special === 'turn') this.clock = Math.min(SWORD_CLIPS.turnDuration, this.clock + delta);
    else if (state === 'idle' && left <= 0 && this.legs.Turn && Math.abs(wrapAngle(aim - facing)) >= SWORD_TURN_MIN_ANGLE) {
      this.special = 'turn'; this.clock = 0; this.turnFrom = facing; this.turnWay = turnSweep(facing, aim);
    }
    this.bodyYaw = this.special === 'turn' ? turnBodyOffset(this.clock, this.turnFrom, this.turnWay, facing) : this.bodyYaw * Math.exp(-22 * delta);
  }
  /** Pernas que substituem a locomoção agora (corpo todo), ou null para seguir a marcha. */
  legsAction(state: PlayerAnimationState, left: number): AnimationAction | null {
    if (this.special === 'death') return this.legs.Death ?? null;
    if (this.special === 'turn') return this.legs.Turn ?? null;
    return left > 0 && (state === 'idle' || state === 'walking' || state === 'backward') ? this.legs.Slash ?? null : null;
  }
  /** O giro começa sem mistura: o quadril do clipe já está compensado pelo corpo. */
  legsFade() { return this.special === 'turn' ? 0 : this.special === 'death' ? .12 : .07; }
  get dying() { return this.special === 'death'; }
  update(state: PlayerAnimationState, left: number, stage: number, base: AnimationAction | null, blocked: boolean) {
    if (blocked && !this.dying) return;
    const unusual = state === 'dashing' || state === 'falling' || state === 'interacting' || state === 'actionTriggered';
    const slash = left > 0 && !unusual && !this.dying;
    const target = this.dying ? this.upper.Death
      : unusual ? null
        : slash ? this.upper.Slash
          : this.special === 'turn' ? this.upper.Turn
            : state === 'walking' ? this.upper.Run : state === 'backward' ? this.upper.Backward : this.upper.Idle;
    if (target !== this.current) {
      this.current?.fadeOut(slash || this.special ? .07 : .16);
      if (target) { target.reset(); target.setLoop(LoopRepeat, Infinity); target.fadeIn(.07).play(); }
      this.current = target ?? null;
    }
    if (!this.current) return;
    if (slash) this.pose(this.legs.Slash, comboClipTime(stage, left));
    else if (this.special) this.pose(this.special === 'death' ? this.legs.Death : this.legs.Turn, this.clock);
    else if (base) { this.current.paused = false; this.current.timeScale = base.timeScale; this.current.time = base.time; }
  }
  /** Tronco e pernas no mesmo instante do clipe, conduzidos pela simulação (nunca pelo mixer). */
  private pose(legs: AnimationAction | null | undefined, time: number) {
    this.current!.paused = true; this.current!.time = time;
    if (legs) { legs.paused = true; legs.time = time; }
  }
  get upperAction() { return this.current; }
  dispose() {
    for (const clip of this.clips) { this.mixer.existingAction(clip, this.root)?.stop(); this.mixer.uncacheAction(clip, this.root); this.mixer.uncacheClip(clip); }
  }
}
