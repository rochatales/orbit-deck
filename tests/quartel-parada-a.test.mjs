import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Box3, Group } from 'three';
import { loadGlb } from './load-glb.mjs';
const root = 'art-source/quartel/';
const read = name => JSON.parse(fs.readFileSync(root + 'notas/' + name, 'utf8'));
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const bytes = fs.readFileSync(root + 'export/barracks-v002.glb');
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));

test('Quartel A: doze blobs de origem e seus hashes permanecem intactos, incluindo armário guardado', () => {
    const origin = read('origem-sha256.json');
    assert.equal(origin.sourceSHA, '7c6b2cab394b279eee1ccd392f975e94d9802960');
    assert.equal(origin.taskBase, '6184b7c9f4cebb994b566319cba748e062e3f1db');
    assert.equal(origin.files.length, 12);
    for (const file of origin.files) {
        assert.equal(hash(file.copy), file.sha256, file.copy);
        assert.equal(fs.statSync(file.copy).size, file.bytes);
        assert.doesNotMatch(file.source, /supply.crate|src\/world|mapConfig|OfficeScene/);
    }
});

test('Quartel A: GLB v002 mantém casco em escala 1, dois acessos, teto/interior próprios e COL sem geometria', () => {
    assert.equal(gltf.scenes.length, 1);
    const node = name => gltf.nodes.find(n => n.name === name);
    for (const name of ['Building_Roof', 'Building_Interior', 'Wall_S', 'Wall_E', 'Wall_N', 'Wall_W', 'EntranceDoor', 'EntranceDoor_S']) {
        assert.notEqual(node(name)?.mesh, undefined, name);
        assert.ok(node('Barracks').children.includes(gltf.nodes.indexOf(node(name))));
    }
    assert.equal(node('Ground'), undefined);
    assert.equal(node('Cube'), undefined);
    assert.deepEqual(node('Barracks').scale ?? [1, 1, 1], [1, 1, 1]);
    assert.deepEqual(node('Barracks').translation ?? [0, 0, 0], [0, 0, 0]);
    assert.deepEqual(node('Barracks').rotation ?? [0, 0, 0, 1], [0, 0, 0, 1]);
    const cols = gltf.nodes.filter(n => n.name?.startsWith('COL_'));
    assert.equal(cols.length, 33);
    assert.ok(cols.every(n => n.mesh === undefined && n.extras.shape));
    assert.equal(node('COL_Floor').extras.shape, 'rounded_rect_floor');
    assert.equal(node('COL_Ramp_W').extras.shape, 'analytic_ramp');
    assert.equal(gltf.animations.length, 2);
});

test('Quartel A: paleta PBR reduz para um material sem aumentar a geometria na conversão', () => {
    assert.equal(gltf.materials.length, 1);
    assert.equal(gltf.images.length, 3);
    const primitives = gltf.meshes.flatMap(m => m.primitives);
    assert.equal(primitives.length, 13);
    assert.ok(primitives.every(p => p.material === 0));
    const triangles = primitives.reduce((n, p) => n + gltf.accessors[p.indices].count / 3, 0);
    assert.equal(triangles, 8278);
    assert.equal(read('build-v002.json').trianglesBeforeAtlas, triangles);
    assert.equal(read('build-v002.json').materialsBeforeAtlas, 21);
    assert.equal(triangles, read('medidas-v002.json').visualTriangles);
    assert.equal(read('medidas-origem.json').visualTriangles, 8414);
    assert.equal(read('medidas-origem.json').visualMaterialCount, 23);
    assert.equal(gltf.materials[0].extensions.KHR_materials_emissive_strength.emissiveStrength, 4);
});

test('Quartel A: estudo usa medidas reais do GLB; validação Blender corresponde à fonte da variante', async () => {
    const fit = read('encaixe-v002.json'), validation = read('validacao-v002.json');
    const asset = await loadGlb(root + 'export/barracks-v002.glb');
    assert.equal(validation.blendSHA256, hash(root + 'blend/barracks-v002.blend'));
    assert.equal(validation.passed, true);
    assert.ok(validation.checks.every(c => c.passed));
    assert.equal(fit.notAppliedToBlendOrGLB, true);
    const placement = new Group(); placement.add(asset.scene);
    for (const option of fit.options) {
        placement.position.set(option.x, 0, option.z);
        placement.rotation.y = -Math.PI / 2;
        placement.scale.setScalar(option.scale);
        placement.updateMatrixWorld(true);
        const box = new Box3().setFromObject(placement);
        for (const [value, expected] of [[box.min.x, option.fullVisualAABB[0]], [box.min.z, option.fullVisualAABB[1]], [box.max.x, option.fullVisualAABB[2]], [box.max.z, option.fullVisualAABB[3]]]) assert.ok(Math.abs(value - expected) < 1e-5);
    }
    assert.ok(fit.options[0].interferences.Oficina.plinthProjectionAreaM2 > 5);
    assert.equal(fit.options[1].interferences.Oficina.plinthProjectionAreaM2, 0);
    for (const option of fit.options.slice(1)) for (const neighbor of ['Laboratório', 'Oficina', 'Praça / hub']) assert.deepEqual(option.interferences[neighbor].componentAABBIntersections, []);
    assert.ok(fit.options[1].eastBeyondZoneAM > 4.4);
    assert.equal(fit.options[2].zoneAPlinthAreaM2, 0);
});

test('Quartel opção 2: v002 permanece intacta; v003 incorpora 0,75× sem escala duplicada nem perda de contratos', async () => {
    for (const file of read('arte-v002-sha256.json').files) assert.equal(hash(file.path), file.sha256, file.path);
    const data = fs.readFileSync(root + 'export/barracks-v003.glb');
    const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)));
    const fit = read('encaixe-v003.json'), validation = read('validacao-v003.json');
    assert.equal(validation.blendSHA256, hash(root + 'blend/barracks-v003.blend'));
    assert.equal(validation.passed, true);
    assert.equal(validation.internalRoute.bodyRadiusUnscaledM, .38);
    const node = name => json.nodes.find(n => n.name === name);
    assert.deepEqual(node('Barracks').scale ?? [1, 1, 1], [1, 1, 1]);
    assert.deepEqual(node('Barracks').translation ?? [0, 0, 0], [0, 0, 0]);
    assert.equal(node('Barracks').extras.baked_scale, .75);
    assert.equal(json.materials.length, 1);
    assert.equal(json.meshes.length, 13);
    assert.equal(json.meshes.flatMap(m => m.primitives).reduce((n, p) => n + json.accessors[p.indices].count / 3, 0), 8278);
    assert.deepEqual(json.animations.map(a => a.name).sort(), ['Door_Open', 'Door_S_Open']);
    assert.equal(json.nodes.filter(n => n.name?.startsWith('COL_')).length, 33);
    assert.ok(Math.abs(node('COL_Ramp_W').extras.rise - .2625) < 1e-8);
    assert.ok(Math.abs(node('COL_Ramp_W').extras.run - 1.2) < 1e-8);
    const asset = await loadGlb(root + 'export/barracks-v003.glb');
    const placement = new Group(); placement.add(asset.scene); placement.rotation.y = -Math.PI / 2; placement.position.x = 10.5; placement.updateMatrixWorld(true);
    const box = new Box3().setFromObject(placement);
    for (const [value, expected] of [[box.min.x, fit.fullVisualAABB[0]], [box.min.z, fit.fullVisualAABB[1]], [box.max.x, fit.fullVisualAABB[2]], [box.max.z, fit.fullVisualAABB[3]]]) assert.ok(Math.abs(value - expected) < 1e-5);
    assert.ok(Object.values(fit.componentAABBIntersections).every(a => a.length === 0));
    for (const clip of asset.animations) {
        const track = clip.tracks.find(t => t.name.endsWith('.position'));
        assert.ok(track);
        assert.ok(Math.abs(Math.max(...track.values.map(Math.abs)) - 1.0875) < 1e-5);
    }
});

test('Quartel v004: v003 e anteriores intactas; apenas acessos ampliados, atlas único e encaixe sem conflito',()=>{
    for(const version of ['v003','v004'])for(const file of read('arte-'+version+'-sha256.json').files) assert.equal(hash(file.path),file.sha256,file.path);
    const data=fs.readFileSync(root+'export/barracks-v004.glb'),json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
    const validation=read('validacao-v004.json'),build=read('build-v004.json'),fit=read('encaixe-v004.json');
    assert.equal(validation.blendSHA256,hash(root+'blend/barracks-v004.blend'));assert.equal(validation.passed,true);
    assert.equal(validation.sourceV003SHA256,hash(root+'blend/barracks-v003.blend'));
    assert.deepEqual(validation.unchangedGeometry,['Building_Roof','Building_Interior','Wall_N','Wall_E','Wall_Corners']);
    assert.equal(validation.freeOpeningRaySamples,40);assert.equal(validation.leafSweepSamples,160);assert.ok(validation.leafCOLMaxErrorM<1e-6);assert.equal(validation.windowGapM,.0625);
    assert.equal(build.sourceTriangles,8278);assert.equal(build.triangles,9054);assert.equal(json.materials.length,1);assert.equal(json.meshes.length,20);
    assert.equal(json.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+json.accessors[p.indices].count/3,0),9054);
    assert.equal(json.nodes.filter(n=>n.name?.startsWith('COL_')).length,65);
    assert.equal(build.doorWidth,1.4);assert.equal(build.doorUsefulHeight,1.665);assert.equal(build.rampWidth,1.6);assert.equal(build.rampRun,1.2);assert.equal(build.rampRise,.2625);
    assert.equal(fit.doorClearWidth,1.4);assert.ok(Object.values(fit.componentAABBIntersections).every(a=>a.length===0));assert.ok(fit.workshopGapM>.8&&fit.zoneAGapM>.91);
    for(const name of ['Building_Roof','Building_Interior'])assert.ok(json.nodes.some(n=>n.name===name&&n.mesh!==undefined));
    assert.deepEqual(json.animations.map(a=>a.name).sort(),['Door_Open','Door_S_Open']);assert.ok(json.animations.every(a=>a.channels.length===4));
});

test('Quartel v005: amplia para leste sem reescalar runtime, móveis +10%, v004 preservada e novos vãos livres',()=>{
    for(const file of read('arte-v005-sha256.json').files)assert.equal(hash(file.path),file.sha256,file.path);
    for(const file of read('arte-v004-sha256.json').files)assert.equal(hash(file.path),file.sha256,file.path);
    const data=fs.readFileSync(root+'export/barracks-v005.glb'),json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
    const build=read('build-v005.json'),validation=read('validacao-v005.json'),fit=read('encaixe-v005.json');
    assert.equal(validation.blendSHA256,hash(root+'blend/barracks-v005.blend'));assert.equal(validation.sourceV004SHA256,hash(root+'blend/barracks-v004.blend'));assert.equal(validation.passed,true);
    assert.deepEqual(build.wallsMapXZ,[10.5,9]);assert.deepEqual(build.placement,{x:12,z:0,rotationYDeg:-90,scale:1});
    assert.equal(build.doorWidth,1.8);assert.ok(Math.abs(build.doorHeight-1.998)<1e-10);assert.equal(build.rampWidth,2);assert.equal(build.rampRun,1.2);assert.equal(build.rampRise,.2625);
    assert.equal(build.furnitureGroups.length,15);for(const group of build.furnitureGroups)for(let i=0;i<3;i++)assert.ok(Math.abs(group.sizeAfter[i]-group.sizeBefore[i]*1.1)<2e-6,group.name);
    assert.equal(validation.freeOpeningRaySamples,40);assert.equal(validation.leafSweepSamples,160);assert.ok(validation.windowGapM>.043);assert.ok(validation.leafCOLMaxErrorM<1e-6);
    assert.equal(json.materials.length,1);assert.equal(json.meshes.length,20);assert.equal(json.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+json.accessors[p.indices].count/3,0),9078);assert.equal(json.nodes.filter(n=>n.name?.startsWith('COL_')).length,65);
    const node=name=>json.nodes.find(n=>n.name===name);assert.deepEqual(node('Barracks').scale??[1,1,1],[1,1,1]);assert.ok(node('Building_Roof')&&node('Building_Interior'));
    for(const name of ['Laboratório','Oficina','Praça / hub'])assert.deepEqual(fit.componentAABBIntersections[name],[]);
    assert.equal(fit.eastAdvanceFromV004M,3);assert.ok(fit.zoneAOccupiedM2>19&&fit.zoneAOccupiedM2<20);assert.ok(fit.workshopGapM>.8);assert.equal(fit.removedZoneMarkers.length,12);
});

test('Quartel v006: fonte v005 intacta, exterior idêntico, COL internos e terceira porta com material único',()=>{
    for(const file of read('arte-v005-sha256.json').files)assert.equal(hash(file.path),file.sha256,file.path);
    for(const file of read('arte-v006-sha256.json').files)assert.equal(hash(file.path),file.sha256,file.path);
    const data=fs.readFileSync(root+'export/barracks-v006.glb'),json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
    const build=read('build-v006.json'),validation=read('validacao-v006.json');
    assert.equal(validation.passed,true);assert.equal(validation.blendSHA256,hash(root+'blend/barracks-v006.blend'));assert.equal(validation.sourceV005SHA256,hash(root+'blend/barracks-v005.blend'));
    assert.equal(validation.unchangedExteriorMeshes.length,19);assert.equal(validation.interiorCOLChecked,25);assert.ok(validation.COLMaxErrorM<1e-6);assert.ok(validation.doorCOLMaxErrorM<1e-6);
    assert.equal(validation.freeOpeningRaySamples,20);assert.equal(validation.bathroomLeafSweepSamples,40);assert.equal(build.bathroomDoor.width,1.2);assert.equal(build.bathroomDoor.height,2);
    assert.equal(json.materials.length,1);assert.equal(json.meshes.length,24);assert.equal(json.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+json.accessors[p.indices].count/3,0),9410);assert.equal(json.nodes.filter(n=>n.name?.startsWith('COL_')).length,90);
    assert.deepEqual(json.animations.map(a=>a.name).sort(),['Bathroom_Open','Door_Open','Door_S_Open']);assert.equal(json.animations.find(a=>a.name==='Bathroom_Open').channels.length,2);
    for(const name of ['Bathroom_Walls','Bathroom_Frame','Door_Bathroom_0','Door_Bathroom_1'])assert.ok(json.nodes.find(n=>n.name===name)?.mesh!==undefined,name);
});
