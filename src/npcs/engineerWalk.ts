import { AnimationMixer, Box3, LoopOnce, Quaternion, Vector3, type AnimationClip, type Object3D, type SkinnedMesh } from 'three';

/** Fecha o corpo inteiro do recorte de Start Walking sem alterar o GLB do cache.
 * A diferença entre as pontas é distribuída pelo ciclo, mantendo duração/cadência.
 * Preparação única da instância, nunca executada no passo de simulação.
 */
export function prepareEngineerWalk(source: AnimationClip, root: Object3D): AnimationClip {
    const clip = source.clone(), first = new Quaternion(), delta = new Quaternion(), rotation = new Quaternion(), correction = new Quaternion();
    for (const track of clip.tracks) {
        const values = track.values, size = track.getValueSize(), end = values.length - size;
        const duration = track.times[track.times.length - 1];
        if (duration <= 0) continue;
        const startValues = values.slice(0, size), endValues = values.slice(end);
        if (track.ValueTypeName === 'quaternion') {
            first.fromArray(startValues); delta.fromArray(endValues).invert().multiply(first);
            for (let i = 0; i < track.times.length; i++) {
                correction.identity().slerp(delta, track.times[i] / duration);
                rotation.fromArray(values, i * size).multiply(correction).normalize().toArray(values, i * size);
            }
        } else {
            for (let i = 0; i < track.times.length; i++)
                for (let j = 0; j < size; j++) values[i * size + j] -= (endValues[j] - startValues[j]) * track.times[i] / duration;
        }
        // Mesmos valores exatos dos dois lados, inclusive após arredondar para float32.
        values.set(startValues, end);
    }

    // Fechar a rotação altera levemente o apoio. Reamostra só a posição do quadril
    // e compensa penetração no chão nas poses derivadas, sem mover X/Z do ator.
    const track = clip.tracks.find(t => t.name.endsWith('Hips.position'));
    const hips = track && root.getObjectByName(track.name.slice(0, -'.position'.length));
    if (!track || !hips?.parent) throw Error('Caminhada do Engenheiro sem quadril.');
    const meshes: SkinnedMesh[] = [];
    root.traverse(node => { if ((node as SkinnedMesh).isSkinnedMesh) meshes.push(node as SkinnedMesh); });
    const count = Math.ceil(clip.duration * 120) + 1, times = new Float32Array(count), values = new Float32Array(count * 3);
    const mixer = new AnimationMixer(root), action = mixer.clipAction(clip), bounds = new Box3(), position = new Vector3();
    action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play();
    try {
        for (let i = 0; i < count; i++) {
            const time = clip.duration * i / (count - 1); times[i] = time;
            mixer.setTime(time); root.updateMatrixWorld(true);
            for (const mesh of meshes) mesh.computeBoundingBox();
            bounds.setFromObject(root);
            hips.getWorldPosition(position); position.y += Math.max(0, -bounds.min.y);
            hips.parent.worldToLocal(position).toArray(values, i * 3);
        }
    } finally {
        mixer.stopAllAction(); mixer.uncacheRoot(root);
    }
    values.set(values.subarray(0, 3), values.length - 3);
    track.times = times; track.values = values;
    return clip;
}
