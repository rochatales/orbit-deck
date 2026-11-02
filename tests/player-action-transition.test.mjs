import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,Vector3} from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
const {ActionTransition}=loadSource('src/characters/player/actionTransition.ts');
const {configureLocomotionAction,crossfadeFor}=loadSource('src/characters/player/locomotionClips.ts');
const file='src/assets/characters/player/explorador-astronauta.glb';
async function setup(){
 const g=await loadGlb(file),mixer=new AnimationMixer(g.scene);
 const actions=Object.fromEntries(Object.entries({idle:'Idle_Colony',walking:'Run_Colony',backward:'Backward_Colony',dash:'Dash'}).map(([key,name])=>[key,mixer.clipAction(g.animations.find(c=>c.name===name))]));
 return {g,mixer,actions};
}

test('Transições: alternar antes de 180 ms conserva peso e fase, sem salto ao reiniciar fades',async()=>{
 const s=await setup(),blend=new ActionTransition(s.actions),dt=1/144;
 blend.to(s.actions.idle,0);s.mixer.update(0);
 assert.equal(s.actions.idle.getEffectiveWeight(),1,'primeira pose não mistura com repouso');
 blend.to(s.actions.walking,.18);for(let i=0;i<6;i++){blend.update(dt);s.mixer.update(dt);}
 const weights=Object.values(s.actions).map(a=>a.getEffectiveWeight()),time=s.actions.idle.time;
 blend.to(s.actions.idle,.18);s.mixer.update(0);
 Object.values(s.actions).forEach((a,i)=>assert.ok(Math.abs(a.getEffectiveWeight()-weights[i])<1e-7));
 assert.equal(s.actions.idle.time,time,'loop que ainda está visível não reinicia na reentrada');
 for(let f=0;f<144;f++){
  if(f%6===0)blend.to(f%12===0?s.actions.walking:s.actions.idle,.18);
  blend.update(dt);s.mixer.update(dt);
  assert.ok(Math.abs(Object.values(s.actions).reduce((sum,a)=>sum+a.getEffectiveWeight(),0)-1)<1e-6);
 }
 const held=Object.values(s.actions).map(a=>a.getEffectiveWeight());blend.update(0);s.mixer.update(0);
 assert.deepEqual(Object.values(s.actions).map(a=>a.getEffectiveWeight()),held);
 blend.to(s.actions.idle,.18);blend.update(.2);s.mixer.update(.2);
 assert.equal(s.actions.idle.getEffectiveWeight(),1);assert.equal(s.actions.walking.isScheduled(),false);
 blend.dispose();assert.ok(Object.values(s.actions).every(a=>!a.isScheduled()));
});

test('Transições: reprodução do salto real de pose a 144 Hz; correção reduz o pico em mais de 80%',async()=>{
 const events=[['idle',0],['walking',.6],['idle',.64],['walking',.68],['idle',.72],['walking',.76]];
 const peaks=[];
 for(const corrected of [false,true]){
  const s=await setup(),blend=new ActionTransition(s.actions),head=s.g.scene.getObjectByName('mixamorigHead');let current,state=null,j=0,previous,max=0;
  for(let f=0;f<1.2*144;f++){
   const t=f/144;
   if(j<events.length&&t>=events[j][1]){
    const next=events[j++][0],target=s.actions[next],fade=crossfadeFor(state,next);
    configureLocomotionAction(target,next);
    if(corrected)blend.to(target,fade);else{target.reset().fadeIn(fade).play();current?.fadeOut(fade);}
    current=target;state=next;
   }
   if(corrected)blend.update(1/144);s.mixer.update(1/144);s.g.scene.updateMatrixWorld(true);
   const p=head.getWorldPosition(new Vector3());if(previous&&t>.5)max=Math.max(max,p.distanceTo(previous));previous=p;
  }
  peaks.push(max);blend.dispose();s.mixer.stopAllAction();
 }
 assert.ok(peaks[0]>.20,`reprodução antiga: ${peaks[0]}`);
 assert.ok(peaks[1]<peaks[0]*.2,`antes/depois: ${peaks}`);
});

test('Transições: Dash pontual reinicia quando pedido e não perde o contrato de duração',async()=>{
 const s=await setup(),blend=new ActionTransition(s.actions);
 configureLocomotionAction(s.actions.dash,'dashing');blend.to(s.actions.dash,.08,true);s.mixer.update(.1);
 assert.ok(s.actions.dash.time>0);blend.to(s.actions.dash,.08,true);assert.equal(s.actions.dash.time,0);
 assert.equal(s.actions.dash.clampWhenFinished,true);blend.dispose();
});
