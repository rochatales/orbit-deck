import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadSource } from './load-source.mjs';
const { GreenhouseRuntime, removeProvisionalGreenhouse } = loadSource('src/scene/marsColony/greenhouseRuntime.ts');
const { validateMasterplan, MasterplanRuntime } = loadSource('src/scene/marsColony/masterplanRuntime.ts');
function fixture() {
 const scene=new Group(), geometry=new BoxGeometry(1,1,1), shared=new MeshStandardMaterial({color:'#123456',emissive:'#000000'});shared.name='M_Status';
 const parts=[['TET_Estufa','roof','both',[]],['TET_Estufa_GrowLights','detail','both',['TET_Estufa']],['ARQ_Estufa_Parede_N','wall','both',[]],['PROP_Estufa_Plantas_Online','prop','online',[]],['PROP_Estufa_Gelo_Online','prop','online',[]],['PROP_Luz_Teto_Online','detail','online',['TET_Estufa']]].map(([id,papel,estado_operacao,apoiado_em])=>({id,papel,ambiente:'greenhouse',estado_operacao,estado_inicial:estado_operacao==='online'?'oculto':'visivel',apoiado_em,apoiado_em_todos:[]}));
 for(const part of parts){const mesh=new Mesh(geometry,shared);mesh.name=part.id;mesh.userData={...part,id_estavel:part.id,apoiado_em:part.apoiado_em.join(','),apoiado_em_todos:''};scene.add(mesh);}
 const manifest={parts,walkableAreas:[{id:'greenhouse',minX:8.5,maxX:19.5,minZ:19,maxZ:26}],doors:[],switchMaterials:[{name:'M_Status',offline:{color:'#2B383A',emissive:'#000000',emissiveIntensity:0},online:{color:'#00F5FF',emissive:'#00F5FF',emissiveIntensity:3}}],growLights:[{x:10,y:3,z:22.5,intensity:5,distance:5,color:'#FF66C4'}]};
 return {scene,manifest,shared,geometry};
}
function step(runtime,x,z){for(let i=0;i<160;i++)runtime.update({x,z},1/60);}
function nodes(scene){const out=new Map();scene.traverse(n=>{if(n.userData.id_estavel)out.set(n.userData.id_estavel,n);});return out;}

test('estufa: OFFLINE inicial; materiais, plantas e luzes alternam sem tocar o cache GLB',()=>{
 const source=fixture(),scene=source.scene.clone(true),runtime=new GreenhouseRuntime(scene,source.manifest),n=nodes(scene),light=scene.children.find(n=>n.isPointLight);
 assert.equal(scene.userData.operationalState,'OFFLINE');assert.equal(light.intensity,0);assert.equal(n.get('PROP_Estufa_Plantas_Online').visible,false);
 assert.equal(n.get('ARQ_Estufa_Parede_N').material.emissiveIntensity,0);
 runtime.setState('ONLINE');assert.equal(scene.userData.operationalState,'ONLINE');assert.equal(light.intensity,5);assert.equal(n.get('PROP_Estufa_Plantas_Online').visible,true);assert.equal(n.get('PROP_Estufa_Gelo_Online').visible,true);
 assert.equal(n.get('ARQ_Estufa_Parede_N').material.color.getHexString(),'00f5ff');assert.equal(n.get('TET_Estufa_GrowLights').material.emissiveIntensity,3);
 runtime.setState('OFFLINE');assert.equal(light.intensity,0);assert.equal(n.get('PROP_Estufa_Plantas_Online').visible,false);assert.equal(n.get('ARQ_Estufa_Parede_N').material.color.getHexString(),'2b383a');
 assert.equal(source.shared.color.getHexString(),'123456');assert.equal(source.shared.emissive.getHexString(),'000000');assert.equal(source.shared.emissiveIntensity,1);
 assert.throws(()=>runtime.setState('INVALIDO'),/Estado da estufa inválido/);runtime.dispose();source.shared.dispose();source.geometry.dispose();
});

test('estufa: ONLINE compõe com corte do teto; plantas ficam, paredes nunca somem',()=>{
 const source=fixture(),runtime=new GreenhouseRuntime(source.scene,source.manifest),n=nodes(source.scene),light=source.scene.children.find(n=>n.isPointLight);
 runtime.setState('ONLINE');step(runtime,14,22.5);
 assert.equal(n.get('TET_Estufa').visible,false);assert.equal(n.get('TET_Estufa_GrowLights').visible,false);assert.equal(n.get('PROP_Luz_Teto_Online').visible,false);assert.equal(light.intensity,0);
 assert.equal(n.get('ARQ_Estufa_Parede_N').visible,true);assert.equal(n.get('PROP_Estufa_Plantas_Online').visible,true);
 runtime.setState('OFFLINE');runtime.setState('ONLINE');assert.equal(n.get('PROP_Luz_Teto_Online').visible,false,'alternar não ressuscita suporte cortado');
 step(runtime,8,22.5);assert.equal(n.get('TET_Estufa').visible,true);assert.equal(n.get('TET_Estufa_GrowLights').visible,true);assert.equal(n.get('PROP_Luz_Teto_Online').visible,true);assert.ok(light.intensity>4.99);
 runtime.setState('OFFLINE');assert.equal(n.get('PROP_Luz_Teto_Online').visible,false);step(runtime,14,22.5);step(runtime,8,22.5);assert.equal(n.get('PROP_Estufa_Plantas_Online').visible,false);assert.equal(light.intensity,0);runtime.dispose();source.shared.dispose();source.geometry.dispose();
});

test('estufa: valida IDs, ciclos, estado operacional, suporte, materiais e orçamento de luzes',()=>{
 for(const [change,expected]of [
  [({scene})=>{scene.children[1].userData.id_estavel='TET_Estufa';},/duplicado/],
  [({scene,manifest})=>{manifest.parts[0].apoiado_em=['TET_Estufa_GrowLights'];scene.children[0].userData.apoiado_em='TET_Estufa_GrowLights';},/Ciclo/],
  [({manifest})=>{manifest.parts[3].estado_operacao='both';},/Estado operacional divergente/],
  [({manifest})=>{manifest.switchMaterials[0].name='inexistente';},/Material de estado ausente/],
  [({manifest})=>{manifest.growLights=Array.from({length:5},()=>manifest.growLights[0]);},/no máximo quatro/],
  [({manifest})=>{manifest.growLights[0].distance=NaN;},/Luz local inválida/],
 ]){const f=fixture();change(f);assert.throws(()=>new GreenhouseRuntime(f.scene,f.manifest),expected);f.shared.dispose();f.geometry.dispose();}
});

test('estufa: libera recursos próprios uma vez; não descarta geometria nem materiais de origem',()=>{
 const f=fixture(),scene=f.scene.clone(true),runtime=new GreenhouseRuntime(scene,f.manifest),materials=new Set();scene.traverse(n=>{if(n.isMesh)materials.add(n.material);});
 let sourceDisposed=0,geometryDisposed=0;f.shared.addEventListener('dispose',()=>sourceDisposed++);f.geometry.addEventListener('dispose',()=>geometryDisposed++);
 const counts=new Map();for(const material of materials){counts.set(material,0);material.addEventListener('dispose',()=>counts.set(material,counts.get(material)+1));}
 runtime.dispose();runtime.dispose();assert.ok([...counts.values()].every(count=>count===1));assert.equal(sourceDisposed,0);assert.equal(geometryDisposed,0);assert.equal(scene.children.some(n=>n.isPointLight),false);
 // React StrictMode remonta a partir do cache original, sempre OFFLINE e com luzes recriadas.
 const second=new GreenhouseRuntime(f.scene.clone(true),f.manifest);second.setState('ONLINE');second.dispose();f.shared.dispose();f.geometry.dispose();
});

test('estufa: provisório é retirado com seu manifesto antes de criar o runtime da colônia',()=>{
 const f=fixture();const old=new Mesh(f.geometry,f.shared);old.userData={id_estavel:'TET_orbit-garden',ambiente:'orbit-garden',estado_inicial:'visivel',apoiado_em:'',apoiado_em_todos:''};f.scene.add(old);
 const manifest={...f.manifest,parts:[...f.manifest.parts,{id:'TET_orbit-garden',papel:'roof',ambiente:'orbit-garden',estado_inicial:'visivel',apoiado_em:[],apoiado_em_todos:[]}],doors:[{id:'D_orbit-garden_west',owner:'orbit-garden'},{id:'D_new',owner:'greenhouse'}]};
 const filtered=removeProvisionalGreenhouse(f.scene,manifest);assert.equal(old.parent,null);assert.equal(manifest.parts.length,7,'manifesto fonte preservado');assert.equal(filtered.parts.length,6);assert.equal(filtered.doors.length,1);validateMasterplan(f.scene,filtered);const runtime=new MasterplanRuntime(f.scene,filtered);runtime.dispose();f.shared.dispose();f.geometry.dispose();
});

test('estufa: candidato real alterna estados e corte após reimportação GLB',async()=>{
 const manifest=JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json'));
 const data=fs.readFileSync('src/assets/greenhouse/greenhouse-v001.glb');
 const source=(await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;
 const scene=source.clone(true),runtime=new GreenhouseRuntime(scene,manifest),n=nodes(scene);assert.equal(scene.userData.operationalState,'OFFLINE');
 for(const p of manifest.parts){const b=new Box3().setFromObject(n.get(p.id));for(const [key,value]of [['minX',b.min.x],['maxX',b.max.x],['minY',b.min.y],['maxY',b.max.y],['minZ',b.min.z],['maxZ',b.max.z]])assert.ok(Math.abs(value-p.bounds[key])<.002,`bounds ${p.id}/${key}`);}
 step(runtime,7.8,22.5);
 for(const suffix of ['L','R']){const b=new Box3().setFromObject(n.get('D_Estufa_Entrada_'+suffix));assert.ok(b.max.z<21.4||b.min.z>23.6,'folha aberta antes de cruzar a entrada');}
 const online=manifest.parts.filter(p=>p.estado_operacao==='online');assert.ok(online.length>=2);for(const p of online)assert.equal(n.get(p.id).visible,false,p.id);
 runtime.setState('ONLINE');for(const p of online)assert.equal(n.get(p.id).visible,true,p.id);
 step(runtime,14,22.5);assert.equal(n.get('TET_Estufa').visible,false);assert.equal(n.get('TET_Estufa_GrowLights').visible,false);
 for(const p of manifest.parts.filter(p=>p.papel==='wall'))assert.equal(n.get(p.id).visible,true,p.id);
 step(runtime,7,22.5);runtime.setState('OFFLINE');for(const p of online)assert.equal(n.get(p.id).visible,false,p.id);
 assert.equal(n.get('TET_Estufa').visible,true);runtime.dispose();
});
