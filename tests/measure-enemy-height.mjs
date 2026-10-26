// Medição offline da pele animada; nenhuma malha é usada pela colisão do jogo.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { AnimationMixer, LoopOnce, Box3, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const { PATROL_UNIT, LARGE_PATROL_VISUAL, SMALL_MUTANT_VISUAL } = loadSource('src/combat/patrolUnit.ts');
export async function measureEnemyHeights() {
    const report = { method: 'Vértices deformados dos GLBs reais, escala do runtime, clipes vivos usados a 120 Hz incluindo início/fim; texturas omitidas só em memória. Amostragem, não prova de extremos contínuos/crossfades.', types: {} };
    for (const [kind, file, scale, names] of [
        ['patrol', 'patrol-unit', PATROL_UNIT.scale, ['Idle', 'PatrolWalk', 'AggressiveLunge']],
        ['largePatrol', 'large-patrol-unit', LARGE_PATROL_VISUAL.scale, ['Idle', 'PatrolWalk', 'AggressiveLunge']],
        ['smallMutant', 'mutant-animal', SMALL_MUTANT_VISUAL.scale, ['Idle', 'PatrolWalk', 'ChaseRun', 'AggressiveLunge']],
    ]) {
        const path = `src/assets/enemies/${file}.glb`, gltf = await loadGlb(path);
        gltf.scene.scale.setScalar(scale);
        const mixer = new AnimationMixer(gltf.scene), box = new Box3(), point = new Vector3(), clips = {};
        for (const name of names) {
            mixer.stopAllAction();
            const clip = gltf.animations.find(c => c.name === name), action = mixer.clipAction(clip);
            action.reset().setLoop(LoopOnce, 1).play(); action.clampWhenFinished = true;
            box.makeEmpty();
            const frames = Math.ceil(clip.duration * 120);
            for (let frame = 0; frame <= frames; frame++) {
                mixer.setTime(Math.min(clip.duration, frame / 120)); gltf.scene.updateMatrixWorld(true);
                gltf.scene.traverse(mesh => {
                    if (!mesh.isMesh) return;
                    if (mesh.isSkinnedMesh) mesh.skeleton.update();
                    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
                        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld); box.expandByPoint(point);
                    }
                });
            }
            clips[name] = { duration: clip.duration, samples: frames + 1, minY: box.min.y, maxY: box.max.y };
        }
        report.types[kind] = { file: path, sha256: createHash('sha256').update(fs.readFileSync(path)).digest('hex'), scale, clips,
            minY: Math.min(...Object.values(clips).map(c => c.minY)), maxY: Math.max(...Object.values(clips).map(c => c.maxY)) };
        mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
    }
    return report;
}
