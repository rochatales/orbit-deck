import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Box3, LinearFilter, MeshStandardMaterial, Texture } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
import { components, visibleComponents } from './structural-components.mjs';
import { coplanarOverlaps } from './lab-coplanar-diagnostic.mjs';
const before = process.env.EXODEN_STRUCTURAL_BASE;
const asset = (id, file) => before ? path.join(before, id + '.glb') : file;
const building = id => asset(id, `src/assets/buildings/${id}.glb`);
const { applyColonyShell } = loadSource('src/scene/marsColony/colonyShell.ts');
const { LaboratorioRuntime } = loadSource('src/scene/marsColony/laboratorioRuntime.ts');
const { ColonyBuildingRuntime } = loadSource('src/scene/marsColony/colonyBuildingRuntime.ts');
const { COLONY_BUILDINGS } = loadSource('src/game/colonyBuildingsLayout.ts');
const { LABORATORIO } = loadSource('src/game/laboratorioLayout.ts');
const steps = (runtime, player) => { for(let i = 0; i < 240; i++) runtime.update(player, 1/60); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readDoc = file => { const b = fs.readFileSync(file); return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12))); };
async function mount(id) {
    const g = await loadGlb(building(id)), scene = g.scene.clone(true), spec = COLONY_BUILDINGS.find(b => b.id === id);
    const motions = spec.dynamicCuboids.map(c => ({ ...c, position: { ...c.position }, rotation: { ...c.rotation } }));
    const runtime = new ColonyBuildingRuntime(scene, g.animations, spec, motions);
    steps(runtime, { x: (spec.roofArea.minX + spec.roofArea.maxX)/2, z: (spec.roofArea.minZ + spec.roofArea.maxZ)/2 });
    return { scene, runtime, spec };
}

test('S6.12 estrutural A: atlas Lab sem mipmap privado e sem recobrir a faixa, anel, tampas/cantos no mesmo plano', async () => {
    const source = 'src/assets/laboratorio/laboratorio-v002.glb';
    const file = before ? source : 'src/assets/laboratorio/laboratorio-visual-v003.glb';
    const g = await loadGlb(file); g.scene.updateMatrixWorld(true);
    const overlaps = coplanarOverlaps(g.scene.getObjectByName('LaboratorySynthesizerMesh'));
    const affected = overlaps.filter(r => {
        const [x,y,z,d] = r.plane.split('/').map(Number);
        return (y > .999 && (Math.abs(d - .002) < 1e-5 || Math.abs(d - 3.6) < 1e-5)) ||
            (z < -.999 && Math.abs(d + 1.04) < 1e-5) || (Math.abs(x) > .999 && Math.abs(Math.abs(d) - 1.49) < 1e-5);
    });
    assert.equal(affected.filter(r => r.area > 1e-6).length, 0, 'faces exteriores concorrentes eliminadas por recorte, sem offset de profundidade');
    const { BuildingAtlasSampling } = loadSource('src/scene/marsColony/buildingAtlasSampling.ts');
    const scene = g.scene.clone(true), mesh = scene.getObjectByName('LaboratorySynthesizerMesh');
    mesh.material = new MeshStandardMaterial({ name: 'MAT_Laboratorio_Atlas_2K' });
    const image = new Texture(); mesh.material.map = image; mesh.material.emissiveMap = image;
    const sampling = new BuildingAtlasSampling(scene), own = mesh.material.map;
    assert.notEqual(own, image); assert.equal(own.generateMipmaps, false); assert.equal(own.minFilter, LinearFilter);
    assert.equal(mesh.material.emissiveMap, own); assert.equal(image.generateMipmaps, true);
    sampling.dispose();
    const originalDoc = readDoc(source), derivedDoc = readDoc(file);
    for (const field of ['nodes','skins','animations','images','textures','materials']) assert.deepEqual(derivedDoc[field], originalDoc[field], field);
    const notes = JSON.parse(fs.readFileSync('art-source/predios-colonia-v001/notas/laboratorio-visual-v003.json'));
    assert.equal(sha(fs.readFileSync(source)), notes.source_sha256);
    assert.equal(sha(fs.readFileSync('src/assets/laboratorio/laboratorio-visual-v003.glb')), notes.sha256);
});

test('S6.12 estrutural B: Laboratório montado abre paredes/teto sem o friso suspenso nos quatro lados', async () => {
    const g = await loadGlb('src/assets/laboratorio/laboratorio-visual-v003.glb'), shell = await loadGlb(asset('laboratorio-casca-v001', 'src/assets/laboratorio/laboratorio-casca-v001.glb'));
    const scene = clone(g.scene), cached = g.scene.getObjectByName('LaboratorySynthesizerMesh').material;
    applyColonyShell(scene, shell.scene, ['Building_Roof']);
    const runtime = new LaboratorioRuntime(scene, g.animations);
    steps(runtime, {x:LABORATORIO.placement.x,z:LABORATORIO.placement.z});
    assert.equal(scene.getObjectByName('Building_Roof').visible, false);
    assert.equal(scene.getObjectByName('Building_Walls').visible, false);
    assert.equal(scene.getObjectByName('Casca_Parede').parent.name, 'Building_Walls');
    assert.ok(new Box3().setFromObject(scene.getObjectByName('Casca_Fixa')).max.y <= 3.1, 'friso a 3,50–3,54 m não pertence à casca fixa');
    assert.notEqual(scene.getObjectByName('LaboratorySynthesizerMesh').material, cached, 'material da máquina privado, sem tocar o cache');
    steps(runtime, {x:100,z:100}); assert.equal(scene.getObjectByName('Building_Roof').visible, true);
    runtime.dispose();
});

test('S6.12 estrutural C: quatro claraboias da Meeting somem com o teto; nenhuma peça permanece acima da parede', async () => {
    const {scene,runtime,spec} = await mount('meeting-room');
    assert.equal(scene.getObjectByName('Building_Roof').visible, false);
    const high = visibleComponents(scene).filter(c => c.max[1] > 2.9);
    assert.deepEqual(high.map(c=>c.mesh), [], 'molduras/vidros 3,008–3,296 m pertencem ao teto');
    for(const side of ['E','N','S','W']) assert.ok(scene.getObjectByName('Building_Roof').getObjectByName('Teto_Wall_'+side));
    steps(runtime,{x:100,z:100}); assert.equal(scene.getObjectByName('Building_Roof').visible, true);
    const baseOpacity = []; scene.getObjectByName('Building_Roof').traverse(n => { if(n.isMesh) for(const m of [].concat(n.material)) baseOpacity.push([m,m.opacity]); });
    runtime.update({x:spec.placement.x,z:spec.placement.z}, .05);
    for(const [material,opacity] of baseOpacity) assert.ok(Math.abs(material.opacity-opacity*runtime.status.roofOpacity)<1e-6, 'todas as peças do teto compartilham a mesma transição');
    runtime.dispose();
});

test('S6.12 estrutural D: remove somente a placa DATA CENTER legada, conserva placa padrão e etiqueta DC', async () => {
    const g = await loadGlb(building('data-center'));g.scene.updateMatrixWorld(true);
    const legacy = components(g.scene.getObjectByName('Wall_S')).filter(c => c.min[0]>1.16&&c.max[0]<3.34&&c.min[1]>2.53&&c.max[1]<3.03&&c.min[2]>3.98&&c.max[2]<4.06);
    assert.equal(legacy.length, 0, 'placa, moldura e letras antigas fora do letreiro padrão');
    const board = g.scene.getObjectByName('Letreiro_Padrao');
    assert.ok(board.getObjectByName('Texto_DATA_CENTER'));assert.ok(board.getObjectByName('Texto_DC'));
    assert.equal(board.parent.name, 'Wall_S');
});

test('S6.12 estrutural E: tubos altos legados saem do Interior do Data Center; editorial não sobra na montagem v007', async () => {
    const {scene,runtime} = await mount('data-center');
    assert.equal(scene.getObjectByName('Building_Roof').visible,false);
    const interior = scene.getObjectByName('Interior'); scene.updateMatrixWorld(true);
    assert.ok(new Box3().setFromObject(interior).max.y < .14, 'restam só os dois cabos baixos, não tubos de 3,13 m');
    const original = await loadGlb('src/assets/colony-v007.glb'), copy=original.scene.clone(true), owned=[];
    const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
    const {removeRoomsForBuildings}=loadSource('src/scene/marsColony/colonyBuildingsColony.ts');
    const next=removeRoomsForBuildings(copy,manifest,owned), editorial=[];
    copy.traverse(n=>{if(n.userData.ambiente==='editorial')editorial.push(n.name)});
    assert.deepEqual(editorial,[]);assert.ok(!next.parts.some(p=>p.ambiente==='editorial'));assert.ok(!next.doors.some(d=>d.owner==='editorial'));
    owned.forEach(g=>g.dispose());runtime.dispose();
});

test('S6.12 estrutural: varredura dos quatro novos prédios e cascas, contratos físicos/portas/cabine preservados', async () => {
    const limits = { 'meeting-room':2.9, 'data-center':3.301, cafeteria:2.91, workshop:2.91 };
    const contracts=JSON.parse(fs.readFileSync('docs/handoffs/s6.12-ajustes-estruturais-colonia/contratos-59b3614.json'));
    // S3.2 alterou somente a apresentação da cabine por modo. O contrato histórico
    // permanece intacto; cabine dev/campanha é verificada por comportamento nos testes
    // ship-cockpit/first-expedition-ui, sem congelar textos futuros por hash de TSX.
    for(const f of contracts.files)if(f.file!=='src/ui/ShipCockpit.tsx')assert.equal(sha(fs.readFileSync(f.file)),f.sha256,f.file);
    for(const [id,limit]of Object.entries(limits)){
        const {scene,runtime}=await mount(id);
        assert.ok(visibleComponents(scene).every(c=>c.max[1]<=limit),id+' deixa componente suspenso acima do corpo da parede/placa');runtime.dispose();
        const g=await loadGlb(building(id));g.scene.updateMatrixWorld(true);const cols=[];
        g.scene.traverse(n=>{if(n.name.startsWith('COL_'))cols.push({name:n.name,matrix:n.matrixWorld.toArray().map(v=>Number(v.toFixed(7)) || 0)})});
        assert.deepEqual(cols.sort((a,b)=>a.name.localeCompare(b.name)),contracts.buildings[id].colliders,id+' COL idênticos');
        assert.deepEqual(JSON.parse(JSON.stringify(g.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.map(t=>({name:t.name,times:Array.from(t.times),values:Array.from(t.values)}))})))),contracts.buildings[id].animations,id+' portas idênticas');
    }
    const shell=await loadGlb('src/assets/quartel/quartel-casca-v001.glb');shell.scene.getObjectByName('Building_Roof').visible=false;
    assert.ok(visibleComponents(shell.scene).every(c=>c.max[1]<2.93),'Quartel: só parede/placa ancoradas, teto e equipamentos invisíveis');
});
