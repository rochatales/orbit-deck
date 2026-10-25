import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Box3}from'three';
import {loadGlb}from'./load-glb.mjs';
import {loadSource}from'./load-source.mjs';
const{createDeckProps,DECK_PROP_NAMES}=loadSource('src/scene/marsColony/landingProps.ts');
const{MARS_CONSOLE_WEST_COLLIDER}=loadSource('src/scene/marsColony/layout.ts');

test('v007/deck: seis conjuntos v006 nas posições aprovadas, tubo/tanques/carrinhos intactos e cache preservado',async()=>{
 const{scene:source}=await loadGlb('src/assets/colony-v006.glb');source.updateMatrixWorld(true);
 const original=new Map();source.traverse(n=>original.set(n,n.matrixWorld.toArray()));
 const props=createDeckProps(source);assert.deepEqual(props.children.map(n=>n.name),[...DECK_PROP_NAMES]);
 for(const[name,x,z]of[['PLAT_Console_Oeste',-3,25.9],['PLAT_Console_Leste',6.85,31.8],['PLAT_Rack_Cilindros',-6.75,31.6]]){const box=new Box3().setFromObject(props.getObjectByName(name));assert.ok(Math.abs((box.min.x+box.max.x)/2-x)<1e-6);assert.ok(Math.abs((box.min.z+box.max.z)/2-z)<1e-6);assert.equal(box.min.y,0);}
 assert.ok(props.getObjectByName('PROP_Tanques_2'));
 for(const name of ['PROP_Tanques','PROP_Tanques_2','PLAT_Carro_1','PLAT_Carro_2'])assert.ok(props.getObjectByName(name).matrixWorld.toArray().every((v,i)=>Math.abs(v-original.get(source.getObjectByName(name))[i])<1e-12),name);
 props.traverse(n=>{if(n.isMesh){const old=source.getObjectByName(n.name);assert.equal(n.geometry,old.geometry);assert.equal(n.material,old.material)}});
 source.traverse(n=>assert.deepEqual(n.matrixWorld.toArray(),original.get(n),'fonte sem transformação'));
});

test('v007/deck: nenhum prop invade módulo/colisor/rota; Oeste só ocupa zona B fora da estrada',async()=>{
 const{scene:source}=await loadGlb('src/assets/colony-v006.glb'),props=createDeckProps(source);
 const v7=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json')),g=JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json')),layout=JSON.parse(fs.readFileSync('src/world/marsMasterplan.json'));
 const boxes=[...v7.colliders,...g.colliders],routes=layout.corridors.filter(p=>['road','path'].includes(p.kind)).map(p=>({id:p.id,minX:p.position.x-p.size.width/2,maxX:p.position.x+p.size.width/2,minZ:p.position.z-p.size.depth/2,maxZ:p.position.z+p.size.depth/2}));
 const overlaps=(a,b)=>a.max.x>b.minX&&a.min.x<b.maxX&&a.max.z>b.minZ&&a.min.z<b.maxZ;
 for(const node of props.children){const b=new Box3().setFromObject(node);assert.deepEqual(boxes.filter(c=>overlaps(b,c)),[],node.name+' sem módulo/colisor');assert.deepEqual(routes.filter(c=>overlaps(b,c)),[],node.name+' sem rota');}
 const west=new Box3().setFromObject(props.getObjectByName('PLAT_Console_Oeste'));assert.ok(west.max.x<=-2.53+1e-6);assert.ok(west.min.x>=MARS_CONSOLE_WEST_COLLIDER.minX);assert.ok(west.max.x<=MARS_CONSOLE_WEST_COLLIDER.maxX);
});
