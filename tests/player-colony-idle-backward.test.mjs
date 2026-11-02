import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AnimationMixer,Box3,KeyframeTrack,LoopOnce,Vector3} from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
import {loadPlayerRuntime} from './load-player-runtime.mjs';
const base='art-source/personagens/explorador-astronauta/';
const report=JSON.parse(fs.readFileSync(base+'notas/f1-v008.json'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const data=c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>KeyframeTrack.toJSON(t))});

test('Colônia v008: duas fontes intactas, 14 ações e todas as doze ações v007 preservadas',async()=>{
 assert.equal(hash(base+report.glb.arquivo),report.glb.sha256);
 assert.equal(hash('src/assets/characters/player/explorador-astronauta.glb'),JSON.parse(fs.readFileSync(base+'notas/f1-v009.json')).glb.sha256);
 assert.equal(report.fontes.arquivos.length,20);
 for(const f of report.fontes.arquivos)assert.equal(hash(base+'mixamo/'+f.file),f.sha256);
 for(const old of report.preservados)assert.equal(hash(base+old.glb),old.sha256);
 const g=await loadGlb(base+report.glb.arquivo),old=await loadGlb(base+report.anterior.glb);
 assert.equal(g.animations.length,14);
 for(const c of old.animations)assert.deepEqual(data(g.animations.find(a=>a.name===c.name)),data(c),c.name);
 for(const [name,file,frames] of [['Idle_Colony','Breathing_Idle.fbx',299],['Backward_Colony','Walking_Backwards.fbx',37]]){
  const c=report.clipes.find(c=>c.clipe===name);assert.equal(c.fonte,file);assert.equal(c.quantidade_quadros,frames);assert.equal(c.loop,true);
  const mixer=new AnimationMixer(g.scene),clip=g.animations.find(c=>c.name===name),action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  let min=Infinity;
  for(let f=0;f<=4*(frames-1);f++){
   mixer.setTime(f/120);g.scene.updateMatrixWorld(true);
   const p=g.scene.getObjectByName('mixamorigHips').getWorldPosition(new Vector3());assert.ok(Math.hypot(p.x,p.z)<1e-5);
   g.scene.traverse(n=>{if(n.isSkinnedMesh)n.computeBoundingBox();});min=Math.min(min,new Box3().setFromObject(g.scene).min.y);
  }
  const {PLAYER_MODEL_ROOT_Y,PLAYER_COLLIDER_CENTER_Y}=loadSource('src/characters/player/playerConfig.ts');
  assert.ok(min+PLAYER_MODEL_ROOT_Y+PLAYER_COLLIDER_CENTER_Y>=0,`${name}: ${min}`);
  mixer.stopAllAction();
 }
});

test('Colônia v008: idle/recuo por mapa, passada de 1,2 m/s e Shanghai sem mudança',async()=>{
 const {colonyLocomotionActions,mapLocomotionCalibration,pickTargetAction,updateLocomotionRates}=loadSource('src/characters/player/locomotionClips.ts');
 const {EXPLORADOR_ASTRONAUTA_ASSET:asset}=loadPlayerRuntime('src/characters/characterAssetConfig.ts');
 const g=await loadGlb(base+report.glb.arquivo),mixer=new AnimationMixer(g.scene),a=Object.fromEntries(g.animations.map(c=>[c.name,mixer.clipAction(c)]));
 const colony=colonyLocomotionActions(a);
 assert.equal(pickTargetAction('idle',colony),a.Idle_Colony);assert.equal(pickTargetAction('backward',colony),a.Backward_Colony);assert.equal(pickTargetAction('walking',colony),a.Run_Colony);
 assert.equal(pickTargetAction('idle',a,true),a.Aim_Rifle);assert.equal(pickTargetAction('walking',a,true),a.Run);
 const cal=mapLocomotionCalibration(asset,false);updateLocomotionRates(colony,colony.Backward,'backward',1.2,cal);
 assert.ok(Math.abs(colony.Backward.timeScale-1.75545822754)<1e-6);
 assert.equal(mapLocomotionCalibration(asset,true).backwardReferenceSpeed,2.8689273214);
 const old={Idle:a.Idle,Run:a.Run,Backward:a.Backward};assert.equal(colonyLocomotionActions(old),old);
 assert.equal(a.Idle.getClip().name,'Idle');assert.equal(a.Backward.getClip().name,'Backward');
});
