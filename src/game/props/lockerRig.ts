import { AnimationClip, AnimationMixer, QuaternionKeyframeTrack, Group, LoopOnce, Mesh, Quaternion, Vector3, type Object3D } from 'three';
import type { SupplyCrate } from '../../combat/simulation';
import { SUPPLY_CRATE } from './supplyCrate';

/** Fonte vem em pose aberta a 62°. Rebaseia só a curva de runtime para 0→108°;
 * GLB permanece intacto e abrir só acontece após a interação aceita. */
export function closedLockerClip(source: AnimationClip) {
  const q = new Quaternion(), up = new Vector3(0, 1, 0);
  const tracks = source.tracks.map(track => {
    if (!track.name.endsWith('.quaternion')) return track.clone();
    // glTF CUBICSPLINE contém tangente/valor/tangente. Amostrar pelo interpolante
    // original evita tratá-las indevidamente como três quaternions consecutivos.
    const interpolant = track.createInterpolant();
    const readAngle = (t: number) => { const value = interpolant.evaluate(t); return 2 * Math.atan2(value[1], value[3]); };
    const first = readAngle(0), end = readAngle(source.duration), times: number[] = [], values: number[] = [];
    const frames = Math.max(1, Math.ceil(source.duration * 30));
    for (let i = 0; i <= frames; i++) {
      const time = source.duration * i / frames, angle = readAngle(time);
      q.setFromAxisAngle(up, Math.abs(end - first) > 1e-8 ? (angle - first) / (end - first) * end : 0);
      times.push(time); values.push(q.x, q.y, q.z, q.w);
    }
    return new QuaternionKeyframeTrack(track.name, times, values);
  });
  return new AnimationClip(source.name + '_RuntimeClosed', source.duration, tracks);
}
export function createLockerRig(source: Object3D, animations: AnimationClip[], crate: SupplyCrate, surfaceY: number) {
  const visual = source.clone(true), root = new Group();
  root.name = crate.id; root.position.set(crate.x, surfaceY, crate.z); root.rotation.y = crate.angle ?? 0;
  root.add(visual);
  visual.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  const original = animations.find(clip => clip.name === 'Door_Open');
  if (!original) throw new Error('Cabine de suprimentos sem Door_Open');
  const clip = closedLockerClip(original), mixer = new AnimationMixer(visual), action = mixer.clipAction(clip);
  action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play(); mixer.setTime(0);
  let last = -1;
  return { root, update() {
    if (last === crate.elapsed) return;
    mixer.setTime(crate.elapsed / SUPPLY_CRATE.duration * clip.duration); last = crate.elapsed;
  }, dispose() { mixer.stopAllAction(); mixer.uncacheRoot(visual); } };
}
