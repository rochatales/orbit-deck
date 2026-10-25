import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const {ResourceRig,resourceClips}=loadSource('src/combat/resourceRig.ts');
const {RESOURCE_VISUAL:V,RESOURCE_KINDS,resourceHeight,resourceRingRadius,resourcePhase,collectDuration,collectClipTime}=loadSource('src/combat/resourceVisual.ts');
const {PATROL_UNIT,LARGE_PATROL_VISUAL}=loadSource('src/combat/patrolUnit.ts');
const {COMBAT}=loadSource('src/combat/config.ts');

test('Recursos: anéis com cor fixa, raio pulsante ±12%, fases próprias e flutuação comum',()=>{
 assert.deepEqual({...V.colors},{titanium:'#ffd35a',copper:'#ff8b32',iron:'#dce5ed',organic:'#76f57b'});
 for(const kind of RESOURCE_KINDS){
  const phase=resourcePhase(3,kind);let sum=0,min=Infinity,max=-Infinity;
  for(let i=0;i<960;i++){const y=resourceHeight(i*V.floatPeriod/960,phase);sum+=y;min=Math.min(min,y);max=Math.max(max,y)}
  assert.ok(Math.abs(sum/960-.35)<1e-10);assert.ok(Math.abs(max-.41)<1e-5);assert.ok(Math.abs(min-.29)<1e-5);
 }
 assert.notEqual(resourcePhase(0,'iron'),resourcePhase(1,'iron'));assert.notEqual(resourcePhase(0,'copper'),resourcePhase(0,'iron'));
 assert.ok(Math.abs(resourceRingRadius(V.ringPeriod/4,0)-V.ringRadius*1.12)<1e-12);
 assert.ok(Math.abs(resourceRingRadius(V.ringPeriod*3/4,0)-V.ringRadius*.88)<1e-12);
 const code=fs.readFileSync('src/combat/ResourceDrops.tsx','utf8');assert.match(code,/if \(drop.active && matches\)/);assert.match(code,/new RingGeometry\(0, 1, 64\)/);assert.match(code,/new ResourceRig\(titanium.scene/);assert.doesNotMatch(code,/boxGeometry/);
});

test('Titânio: novo GLB exato do autor, rig e três clipes; sem lingotes provisórios',async()=>{
 const bytes=fs.readFileSync('src/assets/props/titanio.glb');assert.equal(createHash('sha256').update(bytes).digest('hex'),'1bf1c02491b383cb27f44c5013d12bb29b94c56f21d22c91c1d88e5b1ffd40fd');
 const gltf=await loadGlb('src/assets/props/titanio.glb');assert.ok(gltf.scene.getObjectByName('TitaniumCollectibleMesh').isSkinnedMesh);
 for(const name of ['Idle','SpawnDrop','CollectPickup'])assert.ok(gltf.animations.some(c=>c.name===name));
});

test('Coleta: metade visual a 1×, rampa ease-in e final a 3×, duração 37,5% menor',()=>{
 const duration=collectDuration(1);assert.equal(duration,.625);assert.equal(collectClipTime(.25,1),.25);
 const h=.00001, speed=t=>(collectClipTime(t+h,1)-collectClipTime(t-h,1))/(2*h);
 assert.ok(speed(duration*.65)>1);assert.ok(speed(duration*.7)>speed(duration*.6));assert.ok(Math.abs(speed(duration*.9)-3)<1e-9);
 assert.equal(collectClipTime(duration,1),1);assert.equal(collectClipTime(100,1),1);assert.equal(collectDuration(2),1.25);
});

test('Três GLBs reais: Idle/PulseGlow sem giro Y/bob interno; anel embutido oculto, média 0,35 m',async()=>{
 for(const [index,file]of ['titanio','cobre','ferro'].entries()){
  const gltf=await loadGlb(`src/assets/props/${file}.glb`),before=JSON.stringify(gltf.animations.map(c=>c.toJSON()));
  const rig=new ResourceRig(gltf.scene,gltf.animations,resourcePhase(index,RESOURCE_KINDS[index]));
  rig.update(true,1/60);for(let i=0;i<120;i++)rig.update(true,1/60);
  const poses=[];rig.model.traverse(o=>poses.push({o,q:o.quaternion.clone(),y:o.position.y}));
  let sum=0,min=Infinity,max=-Infinity;
  for(let i=0;i<192;i++){
   rig.update(true,1/120);sum+=rig.root.position.y;min=Math.min(min,rig.root.position.y);max=Math.max(max,rig.root.position.y);
   assert.equal(rig.root.rotation.y,0);
   for(const {o,q,y}of poses){assert.ok(Math.abs(o.quaternion.x-q.x)+Math.abs(o.quaternion.y-q.y)+Math.abs(o.quaternion.z-q.z)+Math.abs(o.quaternion.w-q.w)<1e-7,`${file} ${o.name} sem rotação Idle`);assert.ok(Math.abs(o.position.y-y)<1e-6,`${file} ${o.name} sem bob duplicado`);if(/^HoloRing/.test(o.name))assert.equal(o.scale.length(),0);}
  }
  assert.ok(Math.abs(sum/192-.35)<1e-10);assert.ok(max-min>.119);
  for(const clip of resourceClips(gltf.animations).filter(c=>['Idle','PulseGlow'].includes(c.name)))assert.ok(clip.tracks.every(t=>!t.name.endsWith('.quaternion')&&!t.name.endsWith('.position')));
  rig.update(false,.001);assert.ok(rig.root.visible);rig.update(false,0);assert.ok(rig.root.visible);rig.update(false,.61);assert.ok(rig.root.visible);rig.update(false,.02);assert.equal(rig.root.visible,false);
  assert.equal(JSON.stringify(gltf.animations.map(c=>c.toJSON())),before,'cache de clipes original preservado');rig.dispose();
 }
});

test('Comum visual 2,24 m proporcional; grande 3,20 m; raio/contato comuns aguardam etapa 3',()=>{
 assert.equal(PATROL_UNIT.height,2.24);assert.equal(PATROL_UNIT.scale,2.24/1.49);assert.equal(LARGE_PATROL_VISUAL.height,3.2);
 assert.equal(COMBAT.robot.radius,.42);assert.equal(COMBAT.robot.contactRange,.92);assert.equal(COMBAT.robot.spacing,.75);assert.equal(COMBAT.robot.separation,1.3);
});
