import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, Object3D, Vector3, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { loadSource } from './load-source.mjs';
const { ColonyVisibility } = loadSource('src/scene/marsColony/visibility.ts');
const manifest = JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json', 'utf8'));
function fixture(parts) {
 const scene = new Group();
 for (const part of parts) { const node = new Mesh(new BoxGeometry(4,3,0.2),new MeshStandardMaterial()); node.position.set(0,1.5,1.1); node.name = part.name; scene.add(node); }
 return { scene, visibility: new ColonyVisibility(scene, parts) };
}
const part = (name, extra = {}) => ({name, bounds:{minX:-2,maxX:2,minY:0,maxY:3,minZ:1,maxZ:1.2},apoiado_em:[],apoiado_em_todos:[],...extra});

test('S6.12: exportação completa B3 sem referências, variantes antigas ou colisores de malha', () => {
 const file = fs.readFileSync('src/assets/colony-v006.glb');
 assert.equal(file.readUInt32LE(0), 0x46546c67);
 const json = JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
 const names = new Set(json.nodes.map(node=>node.name));
 assert.ok(manifest.parts.length > 350);
 assert.equal(new Set(manifest.parts.map(p=>p.name)).size,manifest.parts.length);
 for (const p of manifest.parts) {
  assert.ok(names.has(p.name),p.name);
  assert.ok(json.nodes.some(node=>node.extras?.colony_name===p.name),`identidade estável: ${p.name}`);
  assert.doesNotMatch(p.name,/^(REF_|COL_|SPAWN_|INTERACT_|CAM_|LUZ_|PLAT_[AB]_|PLAT_B2_)/);
  for (const support of [...p.apoiado_em,...p.apoiado_em_todos]) assert.ok(names.has(support), support);
 }
 assert.ok(names.has('PLAT_B3_Foguete'));
 assert.ok(names.has('TET_Laboratorio'));
 assert.equal(json.cameras,undefined);
});

test('S6.12: fade contínuo, histerese, materiais privados e piso intacto', () => {
 const parts=[part('ARQ_Parede'),part('ARQ_Piso')];
 const {scene,visibility}=fixture(parts);
 const wall=scene.getObjectByName('ARQ_Parede'),floor=scene.getObjectByName('ARQ_Piso');
 visibility.update({x:0,z:0},new Vector3(0,2,10),1/60);
 assert.equal(wall.visible,true);
 assert.ok(wall.material.opacity<1 && wall.material.opacity>0.8);
 assert.equal(floor.material.opacity,1);
 for(let i=0;i<120;i++)visibility.update({x:0,z:0},new Vector3(0,2,10),1/60);
 assert.ok(wall.material.opacity<0.081);
 for(let i=0;i<60;i++)visibility.update({x:0,z:0},new Vector3(0,2,-10),1/60);
 assert.ok(wall.material.opacity<0.081);
 for(let i=0;i<120;i++)visibility.update({x:0,z:0},new Vector3(0,2,-10),1/60);
 assert.ok(wall.material.opacity>0.99);
 visibility.dispose();
});

test('S6.12: fade não altera materiais do cache e não oscila ao tangenciar peça', () => {
 const source=new Group(),wall=new Mesh(new BoxGeometry(4,3,0.2),new MeshStandardMaterial());
 wall.name='ARQ_Parede';wall.position.set(0,1.5,1.1);source.add(wall);
 const copy=source.clone(true),visibility=new ColonyVisibility(copy,[part(wall.name)]);
 const material=copy.getObjectByName(wall.name).material;
 assert.notEqual(material,wall.material);
 let last=1;
 for(let i=0;i<120;i++){
  visibility.update({x:0,z:0},new Vector3(0,2,i%2?10:-10),1/60);
  assert.ok(material.opacity<=last);last=material.opacity;
 }
 assert.equal(wall.material.opacity,1);assert.equal(wall.material.transparent,false);
 let disposed=0;material.addEventListener('dispose',()=>disposed++);visibility.dispose();assert.equal(disposed,1);
});

test('S6.12: vão real não corta parede e apoio não desaparece em cascata', () => {
 const scene=new Group(),wall=new Group();wall.name='ARQ_Parede';
 for(const x of [-2,2]){const mesh=new Mesh(new BoxGeometry(1,3,0.2),new MeshStandardMaterial());mesh.position.set(x,1.5,1);wall.add(mesh);}
 const prop=new Object3D();prop.name='PROP_Tela';scene.add(wall,prop);
 const visibility=new ColonyVisibility(scene,[part('ARQ_Parede'),part('PROP_Tela',{apoiado_em:['ARQ_Parede']})]);
 for(let i=0;i<120;i++)visibility.update({x:0,z:0},new Vector3(0,2,10),1/60);
 assert.equal(wall.children[0].material.opacity,1);
 for(let i=0;i<120;i++)visibility.update({x:2,z:0},new Vector3(2,2,10),1/60);
 assert.ok(wall.children[0].material.opacity<0.081);
 assert.equal(prop.visible,true);
});

test('S6.12: foguete/base centralizados, serviços e baia retirados só da cópia', () => {
 const {applyColonyLayout,REMOVED_COLONY_PARTS}=loadSource('src/scene/marsColony/layout.ts');
 const scene=new Group();
 for(const part of manifest.parts){const node=new Object3D();node.name=part.name;node.position.set((part.bounds.minX+part.bounds.maxX)/2,0,(part.bounds.minZ+part.bounds.maxZ)/2);scene.add(node);}
 const copy=scene.clone(true);applyColonyLayout(copy);
 for(const name of ['PLAT_B3_Foguete','PLAT_B3_Base_Lancamento']){
  assert.ok(Math.abs(copy.getObjectByName(name).position.x)<0.0001);
  assert.ok(Math.abs(copy.getObjectByName(name).position.z-33)<0.0001);
  assert.equal(scene.getObjectByName(name).position.x,-10);
 }
 for(const name of REMOVED_COLONY_PARTS)assert.equal(copy.getObjectByName(name).visible,false,name);
 const rocket=new Mesh(new BoxGeometry(2,10,2),new MeshStandardMaterial());rocket.name='PLAT_B3_Foguete';rocket.position.set(0,5,33);
 const group=new Group();group.add(rocket);const visibility=new ColonyVisibility(group,[part(rocket.name)]);
 for(let i=0;i<120;i++)visibility.update({x:0,z:29.5},new Vector3(0,15,50),1/60);
 assert.ok(rocket.material.opacity<0.081);
});

function marsWorld(){
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
 return loadSource('src/game/marsWorld.ts').createWorld();
}
test('S6.12: todas as folhas preservam raio, amortecimento, escala, slide, opacidade e luz', () => {
 const world=marsWorld(),doors=[];world.group.traverse(n=>{if(n.name==='PortaAutomatica')doors.push(n);});
 assert.ok(doors.length>5);
 assert.ok(doors.some(d=>{const p=d.getWorldPosition(new Vector3());return Math.hypot(p.x-9.5,p.z+10)<0.1;}),'porta do laboratório');
 for(const door of doors){
  const p=door.getWorldPosition(new Vector3());
  world.update(new Vector3(1000,0,1000),10);
  const [left,right,light]=door.children,width=left.geometry.parameters.width/0.46;
  world.update(new Vector3(p.x+2.36,0,p.z),1/60);assert.equal(left.material.opacity,0.82);
  world.update(new Vector3(p.x+2.34,0,p.z),0.1);
  const amount=1-Math.exp(-0.7);
  assert.ok(Math.abs(left.material.opacity-(0.82-amount*0.68))<1e-9);
  assert.ok(Math.abs(left.scale.x-(1-amount*0.18))<1e-9);
  assert.ok(Math.abs(left.position.x-(-width*0.24-width*0.19*amount))<1e-9);
  assert.ok(Math.abs(right.position.x-(width*0.24+width*0.19*amount))<1e-9);
  assert.ok(Math.abs(light.material.emissiveIntensity-(0.45+amount*0.5))<1e-9);
  assert.equal(door.visible,true);
 }
 const lights=[];world.group.traverse(n=>{if(n.isLight)lights.push(n);});
 assert.ok(lights.some(l=>l.isAmbientLight&&l.intensity===0.22));
 assert.ok(lights.some(l=>l.isPointLight&&l.intensity===8));
});

test('S6.12: embarque acessível antes da base sólida e saída preservada', () => {
 const {isNearShip}=loadSource('src/state/playerTransient.ts');
 assert.equal(isNearShip('mars',{x:0,y:0,z:28}),true);
 assert.equal(isNearShip('mars',{x:0,y:0,z:29.5}),true);
 const {MAPS}=loadSource('src/game/config.ts');assert.equal(MAPS.mars.ship.z,33);assert.equal(MAPS.mars.exit.z,29.5);
});

test('S6.12: os 129 retângulos físicos coincidem com a referência do Blender', () => {
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
 const {createWorld}=loadSource('src/game/marsWorld.ts');
 const world=createWorld();
 const key = rect => rect.map(v=>v.toFixed(3)).join(',');
 assert.equal(manifest.colliders.length,129);
 assert.deepEqual(world.obstacles.map(r=>key([r.minX,r.maxX,r.minZ,r.maxZ])).sort(),manifest.colliders.map(key).sort());
});
