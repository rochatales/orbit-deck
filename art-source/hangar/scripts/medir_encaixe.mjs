/** Medição de estudo, GLB real; nenhuma escrita em src/ ou alteração de runtime. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Box3, Vector3, Raycaster } from 'three';
import { loadGlb } from '../../../tests/load-glb.mjs';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p)));
const source = 'art-source/hangar/', manifest = read('src/assets/colony-v007.manifest.json'), build = read(source+'notas/build_report_v002.json');
const model = await loadGlb(path.join(root,source+'export/hangar_mars_v002.glb'));
model.scene.updateMatrixWorld(true);
const size = new Box3().setFromObject(model.scene), dimensions = size.getSize(new Vector3());
const baseline = read(source+'notas/fontes-v001-sha256.json'), hashes = {};
for (const [file, expected] of Object.entries(baseline)) {
    const preserved = file.endsWith('scripts/build_hangar.py') ? file.replace('build_hangar.py', 'build_hangar_v001.py') : file;
    const actual = createHash('sha256').update(fs.readFileSync(path.join(root,preserved))).digest('hex');
    assert.equal(actual, expected, preserved); hashes[preserved] = actual;
}
for (const file of ['blend/hangar_mars_v002.blend','export/hangar_mars_v002.glb']) hashes[source+file] = createHash('sha256').update(fs.readFileSync(path.join(root,source+file))).digest('hex');
const { z: center } = build.placement;
const portals = { north: { x:0,z:11.5,width:build.doorWidth }, east: { x:4.05,z:15,width:build.doorWidth } };
// Folhas próprias abertas pelos mesmos slide_x/slide_z exportados para a implementação futura.
for (const side of ['north','east']) for (const suffix of ['L','R']) {
    const node = model.scene.getObjectByName(`D_hangar_${side}_${suffix}`); assert.ok(node);
    node.position.x += node.userData.slide_x; node.position.z += node.userData.slide_z;
}
model.scene.position.z = center; model.scene.updateMatrixWorld(true);
const ray = new Raycaster(), origin = new Vector3(), direction = new Vector3();
const portalChecks = [];
for (const [side,p] of Object.entries(portals)) for (const across of [-1.08,0,1.08]) for (const y of [.32,1.3,2.54]) {
    if (side === 'north') { origin.set(p.x+across,y,p.z-.55); direction.set(0,0,1); }
    else { origin.set(p.x+.7,y,p.z+across); direction.set(-1,0,0); }
    ray.set(origin,direction); ray.near=0; ray.far=side==='north'?1.1:1.4;
    const hits = ray.intersectObject(model.scene,true);
    assert.equal(hits.length,0,`${side} ${across}/${y} obstruída por ${hits[0]?.object.name}`);
    portalChecks.push({side,across,y,clear:true});
}
const floor=[];
for (const t of [.1,.5,.9]) {
    const z=build.ramp.thresholdZ+build.ramp.length*t;
    ray.set(origin.set(.7,3,z), direction.set(0,-1,0));ray.far=4;
    const hit=ray.intersectObject(model.scene,true)[0];assert.ok(hit,'superfície da rampa');
    assert.ok(Math.abs(hit.point.y-(.16-.14*t))<.002,JSON.stringify({t,y:hit.point.y}));floor.push({t,z,y:hit.point.y});
}
const ramp = {minX:-2.46,maxX:2.46,minZ:build.ramp.thresholdZ,maxZ:build.ramp.endZ};
const deckWalk = {minX:-2,maxX:2,minZ:25,maxZ:27.4};
const consoleWest={minX:-3.4701,maxX:-2.5299,minZ:25.5384,maxZ:26.2616};
const intersect=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
assert.ok(!intersect(ramp,deckWalk));assert.ok(!intersect(ramp,consoleWest));
const report={base:'485ce91',method:'GLB real, bounds e 18 raios pelos vãos abertos + três raios verticais na rampa; medição de modelo, não física/QA de runtime.',hashes,dimensions:{x:dimensions.x,y:dimensions.y,z:dimensions.z},localBounds:{min:size.min.toArray(),max:size.max.toArray()},placement:build.placement,portals,portalChecks,ramp:{...build.ramp,samples:floor,footprint:ramp},deckWalk,consoleWest,gaps:{rampToDeck:deckWalk.minZ-ramp.maxZ,rampToConsoleZ:consoleWest.minZ-ramp.maxZ},eastConnector:{existingMinX:4.5,wallAxisX:4.05,newFloorMinX:4,refectoryX:5.3,axisExtension:.45,extraFloor:.5,width:2.2,z:15},notes:['A largura 9,58 inclui equipamento lateral; parede leste fica em X=4,05. Conector precisa alongar, não encurtar.','Rampa original termina em Z=19,995; v002 avança 0,155 m até Z=20,15.','Teto e folhas em nós próprios; nenhuma remoção em runtime nesta Parada A.']};
fs.writeFileSync(path.join(root,source+'notas/encaixe_v002.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
