// Replay de entrada/saída com a malha real: medições por material, sem renderer.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { loadSource } from '../tests/load-source.mjs';
const phase=process.argv[2]??'depois';
let reference=process.env.HORDA_QA_VISIBILITY ?? 'src/scene/marsColony/visibility.ts';
if(phase==='antes'&&!process.env.HORDA_QA_VISIBILITY){
 reference=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'s6-12-roof-before-')),'visibility.ts');
 fs.writeFileSync(reference,execFileSync('git',['show','a23138d:src/scene/marsColony/visibility.ts']));
}
const { ColonyVisibility } = loadSource(reference);
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json'));
const bytes=fs.readFileSync('src/assets/colony-v006.glb');
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
loadSource('src/scene/marsColony/layout.ts').applyColonyLayout(scene);
const nodes=new Map();scene.traverse(n=>nodes.set(n.userData.colony_name??n.name,n));
const followers=manifest.parts.filter(p=>[...p.apoiado_em,...p.apoiado_em_todos].some(n=>n.startsWith('TET_')));
const roofs=manifest.parts.filter(p=>p.name.startsWith('TET_')&&!followers.includes(p));
const control=new ColonyVisibility(scene,manifest.parts);
function opacities(name) {const values=[];nodes.get(name).traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])values.push(m.opacity);});return values;}
const result=[];
for(const roof of roofs){
 const children=followers.filter(p=>[...p.apoiado_em,...p.apoiado_em_todos].includes(roof.name));
 const x=(roof.bounds.minX+roof.bounds.maxX)/2,z=(roof.bounds.minZ+roof.bounds.maxZ)/2;
 const r={roof:roof.name,children:children.map(p=>p.name),frames:600,entryMaxDifference:0,exitMaxDifference:0,minRoof:1,returnedRoof:0};
 for(let frame=0;frame<600;frame++){
  const inside=frame>=120&&frame<300;
  const player={x:x+(inside?0:30),z:z+(inside?0:30)};
  const camera=new Vector3(player.x+18,13.55,player.z+18);
  control.update(player,camera,1/60);
  const root=opacities(roof.name)[0];
  if(inside)r.minRoof=Math.min(r.minRoof,root);
  const difference=Math.max(0,...children.flatMap(p=>opacities(p.name).map(o=>Math.abs(root-o))));
  if(inside)r.entryMaxDifference=Math.max(r.entryMaxDifference,difference);
  if(frame>=300)r.exitMaxDifference=Math.max(r.exitMaxDifference,difference);
  if(frame===599)r.returnedRoof=root;
 }
 result.push(r);
}
control.dispose();
const report={phase,delta:1/60,framesPerRoof:600,description:'120 fora, 180 dentro, 300 fora; câmera = player + (18,13.55,18)',result};
const out='docs/handoffs/s6.12/evidencias/telhados';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/${report.phase}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
