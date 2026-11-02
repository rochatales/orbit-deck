import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Vector3, KeyframeTrack } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
import { loadPlayerRuntime } from './load-player-runtime.mjs';
const base='art-source/personagens/explorador-astronauta/';
const report=JSON.parse(fs.readFileSync(base+'notas/f1-v006.json'));
const {colonyLocomotionActions,mapLocomotionCalibration,pickTargetAction,updateLocomotionRates}=loadSource('src/characters/player/locomotionClips.ts');
const {EXPLORADOR_ASTRONAUTA_ASSET:asset,EXPLORADOR_R7_ASSET:r7}=loadPlayerRuntime('src/characters/characterAssetConfig.ts');
const {attachHolsteredRifle,attachRifle,detachRifle}=loadSource('src/characters/player/rifleAttachment.ts');
const {dashEnabled}=loadSource('src/characters/player/playerDash.ts');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const clipData=c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>KeyframeTrack.toJSON(t))});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
async function setup(){
 const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),mixer=new AnimationMixer(g.scene);
 return {g,mixer,actions:Object.fromEntries(g.animations.map(c=>[c.name,mixer.clipAction(c)]))};
}

test('Colônia: v006 acrescenta Standard_Run sem alterar as onze ações do combate nem os GLBs anteriores',async()=>{
 assert.equal(hash(base+report.glb.arquivo),report.glb.sha256);assert.equal(hash(asset.assetPath),JSON.parse(fs.readFileSync(base+'notas/f1-v008.json')).glb.sha256);
 assert.equal(hash(base+'scripts/preparar_f1.py'),JSON.parse(fs.readFileSync(base+'notas/f1-v008.json')).script_sha256);
 for(const p of report.preservados)assert.equal(hash(base+p.glb),p.sha256);
 const historical=await loadGlb(base+'export/explorador-astronauta-rig-v006.glb'),old=await loadGlb(base+'export/explorador-astronauta-rig-v005.glb');
 for(const clip of old.animations)assert.deepEqual(clipData(historical.animations.find(c=>c.name===clip.name)),clipData(clip),clip.name);
 const clip=report.clipes.find(c=>c.clipe==='Run_Colony');assert.equal(clip.fonte,'Standard_Run.fbx');assert.equal(clip.quantidade_quadros,23);close(clip.duracao_s,22/30);
 assert.ok(report.glb.bytes<3_000_000);assert.equal(report.fontes.arquivos.length,17);
});

test('Colônia: Standard_Run, Walking_Backwards e Breathing_Idle por mapa, passada calibrada e fallback antigo intacto',async()=>{
 const s=await setup(),colony=colonyLocomotionActions(s.actions),calibration=mapLocomotionCalibration(asset,false);
 assert.equal(pickTargetAction('walking',colony,false),s.actions.Run_Colony);assert.equal(pickTargetAction('backward',colony,false),s.actions.Backward_Colony);
 assert.equal(pickTargetAction('idle',colony,false),s.actions.Idle_Colony);
 updateLocomotionRates(colony,colony.Run,'walking',4.2,calibration);close(colony.Run.timeScale,4.2/2.7678143978);
 updateLocomotionRates(colony,colony.Backward,'backward',1.2,calibration);close(colony.Backward.timeScale,1.2/0.6835822016);
 close(mapLocomotionCalibration(asset,true).runReferenceSpeed,2.1189701557);
 const old={Idle:s.actions.Idle,Run:s.actions.Run};assert.equal(colonyLocomotionActions(old),old);close(mapLocomotionCalibration(r7,false).runReferenceSpeed,1.6);
 assert.equal(dashEnabled('mars'),false);assert.equal(dashEnabled('shanghai'),true);
 const a=s.actions.Run_Colony;a.reset().play();for(let f=0;f<23;f++){s.mixer.setTime(f/30);s.g.scene.updateMatrixWorld(true);const hips=s.g.scene.getObjectByName('mixamorigHips').getWorldPosition(new Vector3());close(hips.x,0);close(hips.z,0);}
});

test('Colônia: rifle pendurado no Hips em Idle/Run/Backward, sem acompanhar mãos; retorno ao encaixe de combate',async()=>{
 const s=await setup(),weapon=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
 assert.equal(attachHolsteredRifle(s.g.scene,weapon.scene),true);
 const hips=s.g.scene.getObjectByName('mixamorigHips');assert.equal(weapon.scene.parent,hips);
 s.actions.Idle.play();s.mixer.update(0);s.g.scene.updateMatrixWorld(true);
 const grip=weapon.scene.getObjectByName('Grip_R').getWorldPosition(new Vector3());close(grip.x,-.28);close(grip.y,.64);close(grip.z,-.035);
 const muzzle=weapon.scene.getObjectByName('Muzzle');assert.ok(muzzle.getWorldDirection(new Vector3()).y<-.85);
 const minima={};
 for(const name of ['Idle_Colony','Run_Colony','Backward_Colony']){
  s.mixer.stopAllAction();s.actions[name].reset().play();let low=Infinity;
  for(let f=0;f<=30;f++){s.mixer.setTime(f*s.actions[name].getClip().duration/30);s.g.scene.updateMatrixWorld(true);assert.equal(weapon.scene.parent,hips);low=Math.min(low,muzzle.getWorldPosition(new Vector3()).y);}
  minima[name]=low;assert.ok(low>=0,`${name}: cano abaixo do piso ${low}`);
 }
 detachRifle(weapon.scene);assert.equal(weapon.scene.parent,null);assert.equal(attachRifle(s.g.scene,weapon.scene),true);assert.equal(weapon.scene.parent,s.g.scene.getObjectByName('mixamorigRightHand'));
 detachRifle(weapon.scene);assert.equal(attachHolsteredRifle(weapon.scene,s.g.scene),false);
});
