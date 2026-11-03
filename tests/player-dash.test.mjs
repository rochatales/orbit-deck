import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { AnimationMixer, LoopOnce, LoopRepeat } from 'three';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const {advanceDash,dashEnabled}=loadSource('src/characters/player/playerDash.ts');
const {constrainToWalkableAreas}=loadSource('src/characters/player/playerMovement.ts');
const {PLAYER_MOVEMENT:M,PLAYER_COLLIDER_CENTER_Y:center,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_LOCOMOTION:L}=loadSource('src/characters/player/playerConfig.ts');
const {pickTargetAction,crossfadeFor,configureLocomotionAction}=loadSource('src/characters/player/locomotionClips.ts');
const refs=()=>({until:{current:0},cooldown:{current:0},held:{current:false}});
const tick=(s,now,pressed,blocked=false)=>advanceDash(now,pressed,blocked,s.until,s.cooldown,s.held);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('Dash: liberado em Marte e Shanghai, sem liberar mapas desconhecidos',()=>{
 for(const map of ['mars','shanghai']){
  const s=refs();assert.equal(dashEnabled(map),true);
  assert.equal(tick(s,0,true,!dashEnabled(map)),true);close(s.until.current,.72);
 }
 const s=refs();assert.equal(dashEnabled('desconhecido'),false);
 tick(s,0,true);assert.equal(tick(s,.1,true,!dashEnabled('desconhecido')),false);assert.equal(s.until.current,0);
});

test('Dash: borda de Espaço, 0,72 s, cooldown 0,95 s desde o início e sem repetir segurando',()=>{
 const s=refs();assert.equal(tick(s,0,true),true);close(s.until.current,.72);close(s.cooldown.current,.95);
 for(let i=1;i<240;i++)assert.equal(tick(s,i/60,true),i/60<.72);
 tick(s,4,false);assert.equal(tick(s,4.01,true),true);
 const early=refs();tick(early,0,true);tick(early,.3,false);assert.equal(tick(early,.8,true),false);
 assert.equal(tick(early,1,true),false,'pressão negada no cooldown não dispara ao vencer a janela');
 tick(early,1.01,false);assert.equal(tick(early,1.02,true),true);
});

test('Dash: pausa/diálogo/morte/transição cancelam a janela; cooldown usa tempo de simulação',()=>{
 const s=refs();tick(s,0,true);assert.equal(tick(s,.2,true,true),false);assert.equal(s.until.current,0);assert.equal(s.held.current,false);
 for(let i=0;i<100;i++)tick(s,.2,false,true);
 assert.equal(tick(s,.2,false),false);assert.equal(tick(s,.3,true),false);tick(s,.31,false);assert.equal(tick(s,.96,true),true);
});

test('Dash: mesmo colisor Rapier, 5,184 m livres, parede sólida e limite caminhável',async()=>{
 const req=createRequire(import.meta.url),R=createRequire(req.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
 const bounds={minX:-20,maxX:20,minZ:-20,maxZ:20};
 for(const mode of ['free','wall','edge']){
  const world=new R.World({x:0,y:0,z:0});world.timestep=1/60;
  try{
   if(mode==='wall')world.createCollider(R.ColliderDesc.cuboid(.1,2,3).setTranslation(2,2,0));
   const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,center,0));
   const collider=world.createCollider(R.ColliderDesc.capsule(half,M.colliderRadius),body),controller=world.createCharacterController(.06);world.step();
   const areas=mode==='edge'?[{minX:-10,maxX:1,minZ:-5,maxZ:5}]:[bounds],s=refs(),out={x:0,z:0},movement={x:0,y:0,z:0},next={x:0,y:center,z:0};
   let stopped=null;
   for(let f=0;f<100;f++){
    const now=f/60,active=tick(s,now,true),p=body.translation(),dt=active?Math.min(1/60,s.until.current-now):0;
    assert.equal(constrainToWalkableAreas(p.x,p.z,M.dashSpeed*dt,0,bounds,areas,M.colliderRadius,out),out);
    movement.x=out.x;movement.z=out.z;controller.computeColliderMovement(collider,movement);
    const d=controller.computedMovement();next.x=p.x+d.x;next.z=p.z+d.z;body.setNextKinematicTranslation(next);world.step();
    if(!active){if(stopped===null)stopped=body.translation().x;close(body.translation().x,stopped);}
    if(mode==='wall')assert.ok(body.translation().x<=1.9-M.colliderRadius+1e-4);
    if(mode==='edge')assert.ok(body.translation().x<=1+1e-6);
   }
   const x=body.translation().x;
   if(mode==='free')close(x,M.dashSpeed*M.dashDuration);
   if(mode==='wall')assert.ok(x>1.3&&x<1.6);
   if(mode==='edge')assert.ok(x>.8&&x<=1);
  }finally{world.free();}
 }
});

test('Dash: clipe completo cabe em 0,72 s, LoopOnce; saída restaura Run inclusive no fallback r7',async()=>{
 const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),mixer=new AnimationMixer(g.scene);
 const actions=Object.fromEntries(g.animations.map(c=>[c.name,mixer.clipAction(c)]));
 assert.equal(pickTargetAction('dashing',actions,true),actions.Dash);
 configureLocomotionAction(actions.Dash,'dashing');close(actions.Dash.timeScale,actions.Dash.getClip().duration/.72);assert.equal(actions.Dash.loop,LoopOnce);
 actions.Dash.play();mixer.update(.72+1e-5);close(actions.Dash.time,actions.Dash.getClip().duration);assert.equal(actions.Dash.clampWhenFinished,true);
 const fallback=pickTargetAction('dashing',{Run:actions.Run},true);configureLocomotionAction(fallback,'dashing');assert.equal(fallback.loop,LoopOnce);
 configureLocomotionAction(fallback,'walking');fallback.reset().play();mixer.update(2);assert.equal(fallback.loop,LoopRepeat);assert.equal(fallback.clampWhenFinished,false);assert.equal(fallback.isRunning(),true);
 close(crossfadeFor('idle','dashing'),L.crossfadeDash);close(crossfadeFor('dashing','walking'),.08);
});

test('Dash: tecla Space registrada e liberada junto das teclas de movimento',()=>{
 const {GameControl,KEYBOARD_CONTROLS_MAP}=loadSource('src/controls/keyboardControls.ts');
 assert.deepEqual(KEYBOARD_CONTROLS_MAP.find(x=>x.name===GameControl.Dash).keys,['Space']);
 const gate=loadSource('src/game/simulationGate.ts'),oldWindow=globalThis.window,oldEvent=globalThis.KeyboardEvent,codes=[];
 try{globalThis.KeyboardEvent=class{constructor(type,init){this.type=type;Object.assign(this,init)}};globalThis.window={dispatchEvent:e=>codes.push(e.code)};gate.releaseMovementKeys();assert.ok(codes.includes('Space'));assert.ok(codes.includes('KeyW'));}
 finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldEvent===undefined)delete globalThis.KeyboardEvent;else globalThis.KeyboardEvent=oldEvent;}
});
