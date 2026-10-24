import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadSource } from './load-source.mjs';
const layout=JSON.parse(fs.readFileSync('src/world/marsMasterplan.json'));
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {MasterplanRuntime,validateMasterplan}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {MAP_ROOMS,MAP_CORRIDORS,getLocationLabelByPosition}=loadSource('src/world/mapConfig.ts');
const {circleIntersectsRect}=loadSource('src/utils/math.ts');
const file=fs.readFileSync('src/assets/colony-v007.glb');
async function scene(){return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'')).scene;}

test('v007: módulos exatos, nomes, eixos, portas e conexão EDEN/Lab independentes',()=>{
 const expected=[['central-hub',0,0,8,8],['brand-brain',0,-10.5,7,6.5],['smart-lab',10.5,-10.5,8,5],['editorial',-10.5,0,6.5,6.5],['design',10.5,0,6.5,6.5],['narration',-10.5,8.5,6,5.5],['output-review',10.5,8.5,6,5.5],['meeting-suite',0,14.5,9,6],['coffee-nook',7.2,15,3.8,3.8]];
 for(const [id,x,z,w,d]of expected){const r=MAP_ROOMS.find(r=>r.id===id);assert.deepEqual([r.position.x,r.position.z,r.size.width,r.size.depth],[x,z,w,d]);assert.equal(getLocationLabelByPosition(x,z),r.name);}
 assert.deepEqual([...MAP_ROOMS.find(r=>r.id==='smart-lab').doorSides],['west','south']);
 assert.deepEqual([...MAP_ROOMS.find(r=>r.id==='narration').doorSides],['east']);
 assert.deepEqual([...MAP_ROOMS.find(r=>r.id==='output-review').doorSides],['west']);
 assert.equal(MAP_CORRIDORS.find(c=>c.id==='south-connector-meeting').position.z,7.75);
 const greenhouse=MAP_CORRIDORS.find(c=>c.id==='orbit-garden');assert.deepEqual([greenhouse.position.x,greenhouse.position.z,greenhouse.size.width,greenhouse.size.depth],[14,22.5,7,11]);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('src/world/marsMasterplan.json')).digest('hex'),manifest.layoutSha256);
});

test('v007: GLB/manifesto concordam em IDs, apoios, posições e estado; erros são explícitos',async()=>{
 const s=await scene();const {nodes}=validateMasterplan(s,manifest);s.updateMatrixWorld(true);
 for(const p of manifest.parts){const box=new Box3().setFromObject(nodes.get(p.id));for(const [key,n]of [['minX',box.min.x],['maxX',box.max.x],['minY',box.min.y],['maxY',box.max.y],['minZ',box.min.z],['maxZ',box.max.z]])assert.ok(Math.abs(n-p.bounds[key])<.002,`${p.id}/${key}: ${n} versus ${p.bounds[key]}`);}
 assert.equal(nodes.size,manifest.parts.length);
 const duplicate=s.clone(true);duplicate.children[1].userData.id_estavel=duplicate.children[0].userData.id_estavel;assert.throws(()=>validateMasterplan(duplicate,manifest),/duplicado/);
 const absent=structuredClone(manifest);absent.parts[0].id='inexistente';assert.throws(()=>validateMasterplan(s,absent),/ausente/);
 const invalid=structuredClone(manifest);invalid.parts[0].apoiado_em=['inexistente'];s.children.find(n=>n.userData.id_estavel===invalid.parts[0].id).userData.apoiado_em='inexistente';assert.throws(()=>validateMasterplan(s,invalid),/Apoio ausente/);
});

test('v007: só telhado e apoios ocultam dentro; paredes continuam visíveis em qualquer câmera',async()=>{
 const s=await scene(),originalMaterials=[];s.traverse(n=>{if(n.isMesh)originalMaterials.push([n.material,n.material.opacity]);});
 const copy=s.clone(true),runtime=new MasterplanRuntime(copy,manifest),{nodes}=validateMasterplan(copy,manifest);
 for(let i=0;i<150;i++)runtime.update({x:0,z:.8},1/60);
 assert.equal(nodes.get('TET_central-hub').visible,false);assert.equal(nodes.get('Cupula_central-hub').visible,false);
 assert.equal(nodes.get('TET_brand-brain').visible,true);
 for(const p of manifest.parts.filter(p=>p.papel==='wall'))assert.equal(nodes.get(p.id).visible,true,p.id);
 for(let i=0;i<150;i++)runtime.update({x:6.5,z:5},1/60);
 for(const p of manifest.parts.filter(p=>p.papel==='roof'))assert.equal(nodes.get(p.id).visible,true,p.id);
 for(const [mat,opacity]of originalMaterials)assert.equal(mat.opacity,opacity);
 const start=performance.now();for(let i=0;i<3000;i++)runtime.update({x:0,z:i%30},1/60);
 console.log('v007 custo CPU update (3000 passos, Node, sem GPU):',((performance.now()-start)/3000).toFixed(4),'ms/passo');runtime.dispose();
});

test('v007: portas abrem totalmente antes da passagem e fecham; nenhum trilho empurra física',async()=>{
 const s=await scene(),runtime=new MasterplanRuntime(s,manifest),{nodes}=validateMasterplan(s,manifest),world=createWorld();
 for(const door of manifest.doors){
  for(let i=0;i<150;i++)runtime.update({x:door.x,z:door.z},1/60);
  s.updateMatrixWorld(true);
  for(const suffix of ['L','R']){const b=new Box3().setFromObject(nodes.get(door.id+'_'+suffix));const lo=door.axis==='x'?b.min.x:b.min.z,hi=door.axis==='x'?b.max.x:b.max.z,center=door.axis==='x'?door.x:door.z;assert.ok(hi<center-1.0||lo>center+1.0,door.id);}
  assert.ok(!world.obstacles.some(b=>circleIntersectsRect(door.x,door.z,.36,b)),door.id+' vão livre');
 }
 for(let i=0;i<150;i++)runtime.update({x:100,z:100},1/60);
 for(const door of manifest.doors){const left=nodes.get(door.id+'_L'),right=nodes.get(door.id+'_R');assert.ok(Math.abs((door.axis==='x'?right.position.x-left.position.x:right.position.z-left.position.z)-door.width/2)<.001);}
 runtime.dispose();
});

test('v007: pavimento em união exata sem faces superiores coplanares duplicadas',()=>{
 const cells=[...manifest.floorCells,...manifest.sharedFloorCoverage.map(r=>[r.minX,r.maxX,r.minZ,r.maxZ])],areas=manifest.walkableAreas;
 let sum=0;
 for(let i=0;i<cells.length;i++){
  const [x0,x1,z0,z1]=cells[i];assert.ok(x1>x0&&z1>z0);sum+=(x1-x0)*(z1-z0);
  assert.ok(areas.some(a=>x0>=a.minX-1e-9&&x1<=a.maxX+1e-9&&z0>=a.minZ-1e-9&&z1<=a.maxZ+1e-9));
  for(let j=i+1;j<cells.length;j++){const [a,b,c,d]=cells[j];assert.ok(Math.min(x1,b)-Math.max(x0,a)<=1e-9||Math.min(z1,d)-Math.max(z0,c)<=1e-9);}
 }
 // Independent exact sweep union area, not sampling nominal tiled areas.
 const xs=[...new Set(areas.flatMap(a=>[a.minX,a.maxX]))].sort((a,b)=>a-b);let union=0;
 for(let i=1;i<xs.length;i++){const mid=(xs[i-1]+xs[i])/2;const intervals=areas.filter(a=>mid>a.minX&&mid<a.maxX).map(a=>[a.minZ,a.maxZ]).sort((a,b)=>a[0]-b[0]);let start,end,length=0;for(const [a,b]of intervals){if(start===undefined){start=a;end=b;}else if(a<=end)end=Math.max(end,b);else{length+=end-start;start=a;end=b;}}if(start!==undefined)length+=end-start;union+=(xs[i]-xs[i-1])*length;}
 assert.ok(Math.abs(sum-union)<1e-7);console.log('v007 área exata piso/colisões:',union.toFixed(3),'m²; diferença 0 m²');
});

test('v007: fontes anteriores e ARES aprovados preservados por SHA-256',()=>{
 const hashes=JSON.parse(fs.readFileSync('art-source/mars-masterplan-v007/notas/fontes-sha256.json'));
 for(const [path,hash]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,path);
});


test('v007: todos os destinos alcançáveis com raio 0,36m e passo 5cm',async()=>{
 const {execFileSync}=await import('node:child_process');
 execFileSync(process.execPath,['scripts/validate-masterplan-paths.mjs']);
 const report=JSON.parse(fs.readFileSync('art-source/mars-masterplan-v007/notas/alcancabilidade.json'));
 assert.equal(report.destinations.length,12);assert.ok(report.destinations.every(d=>d.reachable));
});

test('v007: zero faces coplanares sobrepostas na arquitetura e junção com ARES',async()=>{
 const {execFileSync}=await import('node:child_process');
 execFileSync(process.execPath,['scripts/validate-masterplan-surfaces.mjs']);
 const report=JSON.parse(fs.readFileSync('art-source/mars-masterplan-v007/notas/coplanaridade.json'));
 assert.equal(report.partPairs,0);assert.equal(report.trianglePairs,0);
});
