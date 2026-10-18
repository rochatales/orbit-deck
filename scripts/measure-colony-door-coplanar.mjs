// Faces coplanares entre molduras de porta e paredes: GLB de 80d9886 contra o atual.
// Causa e regra em scripts/colony_arch_geometry.py; teste em tests/colony-props.test.mjs.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coplanarDoorFrames } from './lib/colony-geometry.mjs';

const BASE = '80d9886';
const parse = async bytes => (await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
const report = { base: BASE, results: [] };
for (const [phase, bytes] of [
    ['antes', execFileSync('git', ['show', `${BASE}:src/assets/colony-v006.glb`], { maxBuffer: 1 << 26 })],
    ['depois', fs.readFileSync('src/assets/colony-v006.glb')]]) {
    const result = coplanarDoorFrames(await parse(bytes));
    report.results.push({
        phase, parts: result.parts, trianglePairs: result.trianglePairs,
        projectedArea: Number(result.pairs.reduce((sum, pair) => sum + pair.projectedArea, 0).toFixed(4)),
        pairs: result.pairs.map(pair => ({ ...pair, projectedArea: Number(pair.projectedArea.toFixed(5)) })),
    });
}
fs.writeFileSync('docs/handoffs/s6.12/evidencias/batentes-coplanaridade-antes-depois.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.results.map(({ phase, trianglePairs, projectedArea, pairs }) =>
    ({ phase, trianglePairs, projectedArea, partPairs: pairs.length }))));
