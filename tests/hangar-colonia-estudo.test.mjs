import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
const root='art-source/hangar/',read=p=>JSON.parse(fs.readFileSync(root+p)),fit=read('notas/encaixe_v002.json'),build=read('notas/build_report_v002.json');
const raw=fs.readFileSync(root+'export/hangar_mars_v002.glb'),data=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12))),glb=await loadGlb(root+'export/hangar_mars_v002.glb');
test('S6.12 Hangar A: v001/fonte/texturas preservados, nova variante abaixo de 10 mil triângulos',()=>{
 for(const[file,hash]of Object.entries(read('notas/fontes-v001-sha256.json'))){const preserved=file.endsWith('scripts/build_hangar.py')?file.replace('build_hangar.py','build_hangar_v001.py'):file;assert.equal(createHash('sha256').update(fs.readFileSync(preserved)).digest('hex'),hash);}
 assert.ok(fit.hashes[root+'export/hangar_mars_v001.glb'].startsWith('749e5b39b078'));
 assert.equal(createHash('sha256').update(raw).digest('hex'),fit.hashes[root+'export/hangar_mars_v002.glb']);
 const triangles=data.meshes.reduce((n,m)=>n+m.primitives.reduce((n,p)=>n+data.accessors[p.indices].count/3,0),0);assert.equal(triangles,build.triangles);assert.ok(triangles<=10000);
 glb.scene.updateMatrixWorld(true);const size=new Box3().setFromObject(glb.scene).getSize(new Vector3());assert.ok(Math.abs(size.x-9.58)<.01);assert.ok(Math.abs(size.y-4.54)<.01);assert.ok(size.z>8.85&&size.z<9.02);
});
test('S6.12 Hangar A: teto próprio e quatro folhas com trilhos do padrão v007; quatro clipes preservados',()=>{
 const roof=glb.scene.getObjectByName('TETO_Hangar'),body=glb.scene.getObjectByName('HangarMesh');assert.ok(roof?.isSkinnedMesh);assert.ok(body?.isSkinnedMesh);assert.equal(roof.userData.papel,'roof');assert.equal(roof.userData.id_estavel,'TET_hangar');
 for(const side of ['north','east'])for(const suffix of ['L','R']){const leaf=glb.scene.getObjectByName(`D_hangar_${side}_${suffix}`);assert.ok(leaf?.isMesh&&!leaf.isSkinnedMesh);assert.equal(leaf.userData.papel,'door');const sign=suffix==='L'?-1:1;assert.ok(Math.abs(leaf.userData[side==='north'?'slide_x':'slide_z']-sign*1.14)<1e-9);}
 assert.deepEqual(glb.animations.map(c=>c.name).sort(),['AlertPulse','CraneWork','Idle','RampOpenClose']);assert.equal(build.bones.length,11);
});
test('S6.12 Hangar A: encaixe mantém norte e Refeitório; rampa não invade passarela/console',()=>{
 assert.equal(fit.placement.x,0);assert.equal(fit.placement.z-3.075,11.5);assert.equal(fit.placement.rotationY,0);assert.equal(fit.portals.north.width,2.2);assert.equal(fit.portals.east.z,15);
 assert.equal(fit.portalChecks.length,18);assert.ok(fit.portalChecks.every(c=>c.clear));
 assert.ok(Math.abs(fit.ramp.endZ-20.15)<1e-6);assert.ok(Math.abs(fit.ramp.extension-.155)<1e-6);assert.ok(fit.ramp.samples[0].y>fit.ramp.samples[2].y);
 assert.ok(Math.abs(fit.gaps.rampToDeck-4.85)<1e-6);assert.ok(fit.gaps.rampToConsoleZ>5.38);assert.equal(fit.eastConnector.axisExtension,.45);
 const source=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));assert.ok(source.walkableAreas.some(a=>a.id==='meeting-suite'));assert.ok(source.walkableAreas.some(a=>a.id==='meeting-exterior-airlock'));assert.ok(source.walkableAreas.some(a=>a.id==='coffee-nook'));

});
