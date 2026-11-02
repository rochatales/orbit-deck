import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AnimationMixer,KeyframeTrack,Box3,LoopOnce,Vector3} from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
const base='art-source/personagens/explorador-astronauta/',report=JSON.parse(fs.readFileSync(base+'notas/f1-v007.json'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const data=c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>KeyframeTrack.toJSON(t))});

test('Rifle final: fonte intacta, onze ações v006 preservadas e Run in-place apoiado em todo o ciclo',async()=>{
 assert.equal(hash(base+report.glb.arquivo),report.glb.sha256);assert.equal(hash('src/assets/characters/player/explorador-astronauta.glb'),report.glb.sha256);
 const f=report.fontes.arquivos.find(f=>f.file==='Rifle _Run_final.fbx');assert.equal(hash(base+'mixamo/'+f.file),f.sha256);assert.equal(report.fontes.arquivos.length,18);
 for(const p of report.preservados)assert.equal(hash(base+p.glb),p.sha256);
 const g=await loadGlb(base+report.glb.arquivo),old=await loadGlb(base+'export/explorador-astronauta-rig-v006.glb');
 for(const c of old.animations.filter(c=>c.name!=='Run'))assert.deepEqual(data(g.animations.find(a=>a.name===c.name)),data(c),c.name);
 const c=report.clipes.find(c=>c.clipe==='Run');assert.equal(c.fonte,'Rifle _Run_final.fbx');assert.equal(c.quantidade_quadros,23);assert.ok(Math.abs(c.taxa_sugerida-1.9820949288)<1e-6);
 assert.ok(report.run_altura.min_z_depois_m>=-.01);assert.ok(report.run_altura.max_altura_sobre_solo_em_quadros_antes_negativos_m<.021);
 const mixer=new AnimationMixer(g.scene),clip=g.animations.find(a=>a.name==='Run'),a=mixer.clipAction(clip).setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();
 let lowest=Infinity;
 for(let frame=0;frame<=88;frame++){
  mixer.setTime(frame/88*clip.duration);g.scene.updateMatrixWorld(true);g.scene.traverse(n=>{if(n.isSkinnedMesh)n.computeBoundingBox();});
  const p=g.scene.getObjectByName('mixamorigHips').getWorldPosition(new Vector3());assert.ok(Math.hypot(p.x,p.z)<1e-5);
  lowest=Math.min(lowest,new Box3().setFromObject(g.scene).min.y);
 }
 const {PLAYER_MODEL_ROOT_Y,PLAYER_COLLIDER_CENTER_Y}=loadSource('src/characters/player/playerConfig.ts');
 assert.ok(lowest+PLAYER_MODEL_ROOT_Y+PLAYER_COLLIDER_CENTER_Y>=0,`pés no jogo abaixo do piso: ${lowest}`);
});

test('Rifle final: corrida com arma apontada sem depender do gatilho; giro e boca física coerentes',async()=>{
 const {RifleAnimationLayers}=loadSource('src/characters/player/rifleAnimationLayers.ts'),{attachRifle,RifleAimRig}=loadSource('src/characters/player/rifleAttachment.ts');
 const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),r=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');attachRifle(g.scene,r.scene);
 const mixer=new AnimationMixer(g.scene),actions=Object.fromEntries(g.animations.map(c=>[c.name,mixer.clipAction(c)])),layers=new RifleAnimationLayers(actions),rig=new RifleAimRig(g.scene,r.scene,.02),out={valid:false,side:0,forward:0,height:0},run=layers.legs.Run;
 run.timeScale=1.9820949288;run.play();
 for(const firing of [false,true])for(let f=0;f<23;f++){
  layers.update('walking',0,firing,run,false);mixer.update(1/60);assert.equal(layers.upperAction.getClip().name,'Run_Tronco');
  rig.update(out,{x:0,z:0},0,{x:0,z:12},true);const p=rig.muzzle.getWorldPosition(new Vector3()),d=rig.muzzle.getWorldDirection(new Vector3()),to=new Vector3(0,p.y,12).sub(p).normalize();
  assert.ok(d.dot(to)>.99999);assert.ok(out.valid);
 }
 layers.dispose();
});
