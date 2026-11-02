import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, Group, LoopOnce, Matrix4, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const {attachBackpack,detachBackpack,createBackpackVisual}=loadSource('src/characters/player/backpackAttachment.ts');
const asset=await loadGlb('src/assets/characters/player/backpack.glb');
const player=await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('Mochila: export isolado preserva a fonte; sem Cube/câmera/luz/colisor ou rig adicional',()=>{
 const base='art-source/player-backpack/',report=JSON.parse(fs.readFileSync(base+'notas/export-v001.json'));
 assert.equal(hash(base+report.source),report.source_sha256);
 assert.equal(hash(base+report.output),report.sha256);
 assert.equal(hash('src/assets/characters/player/backpack.glb'),report.sha256);
 assert.deepEqual(asset.animations,[]);let triangles=0;
 asset.scene.traverse(n=>{assert.ok(!n.isCamera&&!n.isLight&&!n.isBone);assert.ok(!/Cube|COL_/i.test(n.name));if(n.isMesh)triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;});
 assert.equal(triangles,2108);
 const b=new Box3().setFromObject(asset.scene).getSize(new Vector3());
 assert.ok(Math.abs(b.x-.57)<1e-6&&Math.abs(b.y-.534)<1e-6&&Math.abs(b.z-.272)<1e-6);
});

test('Mochila: encaixe rígido nas costas acompanha todos os clipes, sem alterar o rig nem o cache',()=>{
 for(const clip of player.animations){
  const character=clone(player.scene),pack=asset.scene.clone(true),mixer=new AnimationMixer(character);
  const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  assert.equal(attachBackpack(character,pack),true);
  const local=pack.matrix.clone(),original=player.scene.getObjectByName('mixamorigSpine2').quaternion.clone();
  pack.updateMatrix();local.copy(pack.matrix);
  for(let i=0;i<=12;i++){
   mixer.setTime(clip.duration*i/12);character.updateMatrixWorld(true);
   const relative=new Matrix4().copy(pack.parent.matrixWorld).invert().multiply(pack.matrixWorld);
   assert.ok(relative.elements.every((v,k)=>Math.abs(v-local.elements[k])<1e-6),clip.name);
   assert.ok(player.scene.getObjectByName('mixamorigSpine2').quaternion.equals(original));
  }
  if(clip.name==='Idle'){
   mixer.setTime(0);character.updateMatrixWorld(true);const b=new Box3().setFromObject(pack);
   assert.ok(Math.abs(b.min.y-.532)<1e-5&&Math.abs(b.max.y-1.066)<1e-5);
   assert.ok(Math.abs(b.min.z+.384)<1e-5&&Math.abs(b.max.z+.112)<1e-5);
  }
  detachBackpack(pack);detachBackpack(pack);assert.equal(pack.parent,null);
 }
 assert.equal(asset.scene.parent,null);assert.equal(attachBackpack(new Group(),asset.scene.clone(true)),false);
});


test('Mochila neon: uma luz ciano ilumina ao redor e segue o tronco sem tocar no cache',()=>{
 const character=clone(player.scene),pack=createBackpackVisual(asset.scene);
 const lights=[];pack.traverse(n=>{if(n.isLight)lights.push(n);});assert.equal(lights.length,1);
 const light=lights[0];assert.equal(light.color.getHexString(),'00f5ff');assert.equal(light.castShadow,false);
 assert.ok(light.intensity>0&&light.distance>=3);assert.equal(light.decay,2);
 assert.equal(asset.scene.getObjectByName('BackpackNeonLight'),undefined);
 attachBackpack(character,pack);const mixer=new AnimationMixer(character),action=mixer.clipAction(player.animations.find(c=>c.name==='Run'));action.play();
 const local=light.position.clone();let before;
 for(let i=0;i<20;i++){
  mixer.update(1/30);character.updateMatrixWorld(true);
  const world=light.getWorldPosition(new Vector3());assert.ok(light.position.equals(local));
  if(!before)before=world;else if(i===19)assert.ok(world.distanceTo(before)>.01);
 }
 mixer.timeScale=0;const paused=light.getWorldPosition(new Vector3());mixer.update(1);character.updateMatrixWorld(true);assert.ok(light.getWorldPosition(new Vector3()).equals(paused));
 detachBackpack(pack);assert.equal(character.getObjectByName('BackpackNeonLight'),undefined);
});
