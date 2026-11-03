import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, LoopRepeat, LoopOnce, KeyframeTrack, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const {RifleAnimationLayers}=loadSource('src/characters/player/rifleAnimationLayers.ts');
const {updateLocomotionRates,locomotionCalibration,pickTargetAction}=loadSource('src/characters/player/locomotionClips.ts');
const base='art-source/personagens/explorador-astronauta/';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const clipData=c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>KeyframeTrack.toJSON(t))});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
async function setup(){
 const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),mixer=new AnimationMixer(g.scene);
 const actions=Object.fromEntries(g.animations.map(c=>[c.name,mixer.clipAction(c)]));
 const layers=new RifleAnimationLayers(actions);
 return {g,mixer,actions,layers};
}
const bone=(g,name)=>g.scene.getObjectByName('mixamorig'+name);

test('Shanghai: v005 incorpora Run_Backward in-place; dez ações v003 e fontes anteriores preservadas',async()=>{
 const r=JSON.parse(fs.readFileSync(base+'notas/f1-v005.json'));
 assert.equal(hash(base+r.glb.arquivo),r.glb.sha256);
 assert.equal(hash(base+'scripts/preparar_f1.py'),JSON.parse(fs.readFileSync(base+'notas/f1-v009.json')).script_sha256);assert.equal(r.fontes.arquivos.length,17);
 for(const source of r.fontes.arquivos)assert.equal(hash(base+'mixamo/'+source.file),source.sha256);
 for(const old of r.preservados)assert.equal(hash(base+old.glb),old.sha256);
 const g=await loadGlb(base+r.glb.arquivo),old=await loadGlb(base+'export/explorador-astronauta-rig-v003.glb');
 for(const clip of old.animations)assert.deepEqual(clipData(g.animations.find(c=>c.name===clip.name)),clipData(clip),clip.name);
 const m=new AnimationMixer(g.scene),clip=g.animations.find(c=>c.name==='Backward_Rifle'),a=m.clipAction(clip).setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();
 assert.equal(r.clipes.find(c=>c.clipe==='Backward_Rifle').quantidade_quadros,16);close(clip.duration,.5);
 for(let f=0;f<16;f++){m.setTime(f/30);g.scene.updateMatrixWorld(true);const p=bone(g,'Hips').getWorldPosition(new Vector3());close(p.x,0);close(p.z,0);}
});

test('Shanghai: W conserva Rifle _Run_final no corpo inteiro, inclusive durante os tiros',async()=>{
 const s=await setup(),reference=await setup();
 const leg=s.layers.legs.Run;leg.play();s.layers.update('walking',0,true,leg,false);s.mixer.update(.2);
 reference.actions.Run.play();reference.mixer.update(.2);
 assert.equal(s.layers.legs.Run.getClip().name,'Run_Pernas');
 assert.ok(leg.isRunning());
 assert.ok(bone(s.g,'LeftUpLeg').quaternion.angleTo(bone(reference.g,'LeftUpLeg').quaternion)<1e-3, `erro angular ${bone(s.g,'LeftUpLeg').quaternion.angleTo(bone(reference.g,'LeftUpLeg').quaternion)}`);
 for (const name of ['Spine','Spine2','Head','RightArm','RightHand','LeftArm','LeftHand']) {
  assert.ok(bone(s.g,name).quaternion.angleTo(bone(reference.g,name).quaternion)<1e-3,name);
 }
 const upper=s.layers.upperAction;
 assert.equal(upper.getClip().name,'Run_Tronco');close(upper.time,leg.time);
 assert.ok(upper.getClip().tracks.every(t=>!t.name.includes('Hips')&&!t.name.includes('Leg')&&!t.name.includes('Foot')));
 updateLocomotionRates(s.layers.legs,leg,'walking',4.2,locomotionCalibration({runReferenceSpeed:2.1189701557}));
 s.layers.update('walking',0,true,leg,false);close(upper.timeScale,leg.timeScale);
 s.layers.update('walking',0,false,leg,false);assert.equal(s.layers.upperAction,upper,'soltar tiro não troca o ciclo W');
 s.layers.dispose();reference.layers.dispose();
});

test('Shanghai: recuo usa Run_Backward a 0,418×; ações anteriores continuam disponíveis para comparação',async()=>{
 const s=await setup(),c=locomotionCalibration({backwardReferenceSpeed:2.8689273214,backwardTimeScale:[.2,2]});
 const target=pickTargetAction('backward',s.layers.legs,true);assert.equal(target.getClip().name,'Backward_Pernas');
 updateLocomotionRates(s.layers.legs,target,'backward',1.2,c);close(target.timeScale,1.2/2.8689273214);
 assert.deepEqual(target.getClip().tracks.map(t=>KeyframeTrack.toJSON(t)),s.actions.Backward_Rifle.getClip().tracks.filter(t=>!/mixamorig(?:Spine|Neck|Head|LeftArm|RightArm|LeftShoulder|RightShoulder|LeftForeArm|RightForeArm|LeftHand|RightHand)/.test(t.name)).map(t=>KeyframeTrack.toJSON(t)));
 assert.equal(pickTargetAction('backward',s.actions,false),s.actions.Backward);
 const old=locomotionCalibration({backwardReferenceSpeed:1.4012,backwardTimeScale:[.2,2]});updateLocomotionRates(s.actions,s.actions.Backward,'backward',1.2,old);close(s.actions.Backward.timeScale,1.2/1.4012);
 s.layers.dispose();
});

test('Shanghai: Reloading sincroniza 3,667 s em 1,5 s sem substituir pernas; pausa congela e Dash suprime tronco',async()=>{
 const s=await setup(),baseAction=s.layers.legs.Run; baseAction.play();
 s.layers.update('walking',1.5,false,baseAction,false);s.mixer.update(.1);
 const reload=s.layers.upperAction;assert.equal(reload.loop,LoopOnce);assert.ok(reload.clampWhenFinished);close(reload.time,0);
 s.layers.update('walking',1,false,baseAction,false);s.mixer.update(.1);close(reload.time,reload.getClip().duration/3);assert.ok(baseAction.isRunning());
 const time=reload.time;s.layers.update('walking',.5,false,baseAction,true);close(reload.time,time);
 s.layers.update('walking',.25,false,baseAction,false);s.mixer.update(.01);close(reload.time,reload.getClip().duration*5/6);
 s.layers.update('walking',0,false,baseAction,false);s.mixer.update(.1);assert.equal(reload.getEffectiveWeight(),0);
 s.layers.update('dashing',.2,true,baseAction,false);s.mixer.update(.1);assert.equal(s.layers.upperAction,null);assert.equal(reload.getEffectiveWeight(),0);
 s.layers.dispose();
});

test('Shanghai: boca animada continua alinhada à mira ao correr atirando e recuar apontando',async()=>{
 const {attachRifle,RifleAimRig}=loadSource('src/characters/player/rifleAttachment.ts');
 for(const state of ['walking','backward']){
  const s=await setup(),rifle=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');attachRifle(s.g.scene,rifle.scene);
  const rig=new RifleAimRig(s.g.scene,rifle.scene,.02),base=pickTargetAction(state,s.layers.legs,true);
  base.play();const out={valid:false,side:0,forward:0,height:0};
  for(let f=0;f<20;f++){
   s.layers.update(state,0,state==='walking',base,false);s.mixer.update(1/60);
   rig.update(out,{x:0,z:0},0,{x:0,z:12},true);
   const p=rig.muzzle.getWorldPosition(new Vector3()),dir=rig.muzzle.getWorldDirection(new Vector3()),to=new Vector3(0,p.y,12).sub(p).normalize();
   assert.ok(dir.dot(to)>.99999);close(out.height,p.y+.02);assert.ok(out.valid);
  }
  s.layers.dispose();
 }
});


test('Shanghai: Firing_Rifle permanece no tiro parado/recuando; recarga continua acima da corrida',async()=>{
 const s=await setup();
 for(const state of ['idle','backward']){
  const base=pickTargetAction(state,s.layers.legs,true);base.play();
  s.layers.update(state,0,true,base,false);assert.equal(s.layers.upperAction.getClip().name,'Firing_Rifle_Tronco');
 }
 s.layers.update('walking',1,true,s.layers.legs.Run,false);assert.equal(s.layers.upperAction.getClip().name,'Reloading_Tronco');
 s.layers.dispose();
});
