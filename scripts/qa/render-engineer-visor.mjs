// Exporta somente geometria posada de QA; não altera GLBs/fontes.
import fs from 'node:fs';
import { Vector3, Box3 } from 'three';
import { loadGlb } from '../../tests/load-glb.mjs';
import { loadSource } from '../../tests/load-source.mjs';
const { EngineerRig } = loadSource('src/npcs/engineerRig.ts');
const { ENGINEER } = loadSource('src/npcs/engineerRoutine.ts');
const output = 'docs/sprint-3/evidencias/s3.2-primeira-expedicao';
fs.mkdirSync(output, { recursive: true });
const poses = [];
for (const [animation, time] of [['Idle', 0], ['Walk', .6], ['Sitting', 1]]) {
    const gltf = await loadGlb('src/assets/characters/npcs/engenheiro-v001.glb');
    const rig = new EngineerRig(gltf.scene, gltf.animations);
    const state = { x: 0, y: 0, z: 0, angle: 0, animation, clipTime: 0 };
    for (let f = 0; f < 8; f++) rig.update(state, .05);
    rig.actions.get(animation).time = time; rig.mixer.update(0); gltf.scene.updateMatrixWorld(true);
    const meshes = [], point = new Vector3(), bounds = new Box3();
    gltf.scene.traverse(mesh => {
        if (!mesh.isMesh) return;
        if (mesh.isSkinnedMesh) mesh.skeleton.update();
        const positions = [], geometry = mesh.geometry;
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
            positions.push(...point.toArray()); bounds.expandByPoint(point);
        }
        meshes.push({ name: mesh.name, positions, indices: [...geometry.index.array], uv: geometry.attributes.uv ? [...geometry.attributes.uv.array] : null,
            material: mesh.name === 'ColonyVisorStripe' ? 'stripe' : mesh.name === 'ColonyVisorHalo' ? 'halo' : 'suit' });
    });
    poses.push({ animation, time, meshes, bounds: [bounds.min.toArray(), bounds.max.toArray()], head: rig.visor.head.getWorldPosition(new Vector3()).toArray() });
    rig.dispose();
}
fs.writeFileSync(`${output}/engineer-visor-poses.json`, JSON.stringify({ visualScale: ENGINEER.visualScale, poses }));
