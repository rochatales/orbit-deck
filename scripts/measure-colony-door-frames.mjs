// Batentes verdes das portas (ARQ_*_Porta_*) contra as paredes que os apoiam:
// compara o corte aprovado em 80d9886 com o runtime atual, atravessando cada portal
// a 60 Hz com a câmera isométrica do jogo em 4 ângulos.
//   dessincronia: |fator do batente − fator de uma parede de apoio| > 0,3 no mesmo quadro;
//   profundidade translúcida: material com opacidade < 0,995 que ainda escreve profundidade.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { loadSource } from '../tests/load-source.mjs';

const BASE = '80d9886';
const manifest = JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's6-12-door-frames-'));
for (const file of ['visibility.ts', 'doorAlignment.ts', 'roofSupports.ts'])
    fs.writeFileSync(path.join(dir, file), execFileSync('git', ['show', `${BASE}:src/scene/marsColony/${file}`]));
const { ColonyVisibility: Before } = loadSource(path.join(dir, 'visibility.ts'));
const { ColonyVisibility: After } = loadSource('src/scene/marsColony/visibility.ts');
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) };
const { createWorld } = loadSource('src/game/marsWorld.ts');
const { applyColonyLayout } = loadSource('src/scene/marsColony/layout.ts');
const bytes = fs.readFileSync('src/assets/colony-v006.glb');
const portals = manifest.parts.filter(part => /^ARQ_.*_Porta_/.test(part.name));
const report = { base: BASE, delta: 1 / 60, framesPerCrossing: 240, angles: 4, portals: portals.length, results: [] };

const materialsOf = node => {
    const list = [];
    node?.traverse(object => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) list.push(material);
    });
    return list;
};

for (const [phase, Controller] of [['antes', Before], ['depois', After]]) {
    const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    applyColonyLayout(scene);
    const world = createWorld();
    const controller = new Controller(scene, manifest.parts, world.group);
    const nodes = new Map();
    scene.traverse(node => nodes.set(node.userData.colony_name ?? node.name, node));
    // Opacidade de referência: logo após a montagem, antes de qualquer corte.
    const base = new Map();
    const all = [];
    scene.traverse(object => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (!base.has(material)) { base.set(material, material.opacity); all.push(material); }
        }
    });
    const factor = materials => {
        let value = 1;
        for (const material of materials) {
            const reference = base.get(material);
            if (reference > 0) value = Math.min(value, material.opacity / reference);
        }
        return value;
    };
    const player = new Vector3();
    const camera = new Vector3();
    const perPortal = [];
    let desynced = 0;
    let translucentDepth = 0;
    for (const portal of portals) {
        // Folhas GLB do laboratório ficam ocultas pelo layout (a folha animada as substitui).
        if (!nodes.get(portal.name)?.visible) continue;
        const frame = materialsOf(nodes.get(portal.name));
        const walls = portal.apoiado_em.filter(name => name.startsWith('ARQ_')).map(name => ({ name, materials: materialsOf(nodes.get(name)) }))
            .filter(wall => wall.materials.length);
        const b = portal.bounds;
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        const alongZ = b.maxX - b.minX > b.maxZ - b.minZ;
        let portalDesync = 0;
        let maxDiff = 0;
        for (let k = 0; k < 4; k++) {
            const angle = Math.PI / 4 + k * Math.PI / 2;
            for (let f = 0; f < 240; f++) {
                const s = -4 + f / 239 * 8;
                player.set(alongZ ? cx : cx + s, 0, alongZ ? cz + s : cz);
                camera.set(player.x + Math.sin(angle) * 60, 48, player.z + Math.cos(angle) * 60);
                world.update(player, 1 / 60);
                controller.update(player, camera, 1 / 60);
                const own = factor(frame);
                for (const wall of walls) {
                    const diff = Math.abs(own - factor(wall.materials));
                    maxDiff = Math.max(maxDiff, diff);
                    if (diff > 0.3) { portalDesync++; desynced++; break; }
                }
                for (const material of all) if (material.opacity < 0.995 && material.depthWrite) { translucentDepth++; break; }
            }
        }
        perPortal.push({ portal: portal.name, walls: walls.map(wall => wall.name), desyncedFrames: portalDesync, maxDiff: Number(maxDiff.toFixed(3)) });
    }
    controller.dispose();
    report.results.push({ phase, desyncedFrames: desynced, translucentDepthFrames: translucentDepth, perPortal });
}

const out = 'docs/handoffs/s6.12/evidencias';
fs.writeFileSync(`${out}/batentes-portas-antes-depois.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.results.map(({ phase, desyncedFrames, translucentDepthFrames, perPortal }) => ({
    phase, desyncedFrames, translucentDepthFrames, portalsWithDesync: perPortal.filter(p => p.desyncedFrames).length,
})), null, 2));
