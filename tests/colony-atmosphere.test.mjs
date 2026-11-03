import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const policy=loadSource('src/scene/marsColony/sandwindPolicy.ts');
const {perimeterLightPositions}=loadSource('src/scene/marsColony/perimeterLights.ts');
const {writeVisorLight}=loadSource('src/scene/visorPose.ts');
const {MARS_SUNRISE,SHANGHAI_DAWN,VISOR_LIGHT}=loadSource('src/scene/lightingConfig.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('Atmosfera: Sandwind compacto fixo, painel separado, override 0 e reduced motion respeitado',()=>{
 assert.deepEqual(policy.defaultSandwindSettings(false),{enabled:true,culling:true,wind:true,profile:'compact'});
 assert.equal(policy.defaultSandwindSettings(true).wind,false);
 for(const q of['','?perf','?comparar','?sandwindPanel'])assert.equal(policy.sandwindPreviewEnabled(q),true);
 assert.equal(policy.sandwindPreviewEnabled('?sandwindPreview=0'),false);
 for(const q of['','?perf','?sandwindPreview=0','?sandwindPreview'])assert.equal(policy.sandwindPanelEnabled(q),false);
 for(const q of['?sandwindPanel','?sandwindQA=1','?sandwindPreview=1'])assert.equal(policy.sandwindPanelEnabled(q),true);
 assert.deepEqual(policy.SANDWIND_PROFILES.compact,{label:'Compacto',clear:12,opaque:28,hide:34,reveal:30});
});

test('Balizas: só contorno externo, sem fechar buracos internos da união dos pisos',()=>{
 const ring=[{minX:0,maxX:10,minZ:0,maxZ:2},{minX:0,maxX:10,minZ:8,maxZ:10},{minX:0,maxX:2,minZ:2,maxZ:8},{minX:8,maxX:10,minZ:2,maxZ:8}];
 const p=perimeterLightPositions(ring,[]);assert.equal(p.length,12);
 assert.ok(p.every(p=>p.x<0||p.x>10||p.z<0||p.z>10));
 assert.deepEqual(perimeterLightPositions([],[]),[]);
});

test('Balizas: colônia consolidada gera posições únicas na areia, sem sólidos nem mudança do mundo',()=>{
 const {createWorld}=loadSource('src/game/marsWorld.ts'),w=createWorld(),before=JSON.stringify({areas:w.walkableAreas,solids:w.obstacles});
 const p=perimeterLightPositions(w.walkableAreas,w.obstacles);assert.ok(p.length>20&&p.length<300,`balizas ${p.length}`);
 assert.equal(new Set(p.map(p=>`${p.x}/${p.z}`)).size,p.length);
 for(const v of p){assert.ok(w.walkableAreas.every(a=>v.x<a.minX||v.x>a.maxX||v.z<a.minZ||v.z>a.maxZ));assert.ok(w.obstacles.every(o=>v.x<o.minX-.1||v.x>o.maxX+.1||v.z<o.minZ-.1||v.z>o.maxZ+.1));}
 assert.equal(JSON.stringify({areas:w.walkableAreas,solids:w.obstacles}),before);
 assert.deepEqual(perimeterLightPositions(w.walkableAreas,w.obstacles),p);
});

test('Luz: sol rasante quente em Marte; Shanghai escuro e foco do visor acompanha olhar e piso',()=>{
 const [x,y,z]=MARS_SUNRISE.sunPosition;assert.ok(y/Math.hypot(x,z)<.2);assert.ok(MARS_SUNRISE.hemisphereIntensity<.5);
 assert.ok(SHANGHAI_DAWN.hemisphereIntensity<.5&&SHANGHAI_DAWN.sunIntensity<.2);
 const p={x:0,y:0,z:0},target={x:0,y:0,z:0},player={x:3,y:.25,z:-2};
 for(const angle of[0,Math.PI/2,Math.PI,-Math.PI/2,.8]){
  writeVisorLight(p,target,player,angle);
  close(p.x,player.x+Math.sin(angle)*VISOR_LIGHT.forward);close(p.z,player.z+Math.cos(angle)*VISOR_LIGHT.forward);close(p.y,player.y+VISOR_LIGHT.height);
  close(target.x,player.x+Math.sin(angle)*VISOR_LIGHT.aimDistance);close(target.z,player.z+Math.cos(angle)*VISOR_LIGHT.aimDistance);assert.ok(target.y<p.y);
 }
});


test('Balizas: alturas/normais da areia pré-medidas, assinatura do layout/GLB e gerador reprodutível',()=>{
 const baked=JSON.parse(fs.readFileSync('src/assets/colony-perimeter-lights.json'));
 const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
 assert.equal(hash(fs.readFileSync(baked.source)),baked.sourceSha256);assert.equal(hash(fs.readFileSync(baked.generator)),baked.generatorSha256);
 const w=loadSource('src/game/marsWorld.ts').createWorld();
 assert.equal(hash(JSON.stringify({areas:w.walkableAreas,obstacles:w.obstacles})),baked.layoutSha256);
 assert.deepEqual(baked.positions.map(({x,z})=>({x,z})),perimeterLightPositions(w.walkableAreas,w.obstacles));
 for(const p of baked.positions){assert.ok(p.y<0&&p.y>=-.301);assert.ok(Math.abs(Math.hypot(...p.normal)-1)<1e-6);assert.ok(p.normal[1]>.8);}
});


test('Foco: origem 18 cm acima da boca em Idle/Dash, sem deslocar o alvo pela câmera',async()=>{
 const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),r=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
 const {RifleAimRig,attachRifle}=loadSource('src/characters/player/rifleAttachment.ts');attachRifle(g.scene,r.scene);
 const rig=new RifleAimRig(g.scene,r.scene,.02,VISOR_LIGHT.headOffset),mixer=new AnimationMixer(g.scene),gun={valid:false,side:0,forward:0,height:0},head={...gun};
 const p={x:0,y:0,z:0},target={x:0,y:0,z:0},player={x:0,y:0,z:0};
 mixer.clipAction(g.animations.find(c=>c.name==='Idle')).play();mixer.setTime(0);rig.update(gun,player,0,null,false,head);
 writeVisorLight(p,target,player,0,gun);close(p.y,gun.height+VISOR_LIGHT.muzzleLift);close(p.x,gun.side);close(p.z,gun.forward);
 mixer.stopAllAction();mixer.clipAction(g.animations.find(c=>c.name==='Dash')).play();let low=Infinity,high=-Infinity;
 for(let f=0;f<39;f++){mixer.setTime(f/30);rig.update(gun,player,0,null,false,head);writeVisorLight(p,target,player,0,gun);low=Math.min(low,p.y);high=Math.max(high,p.y);close(p.y,gun.height+VISOR_LIGHT.muzzleLift);close(p.x,gun.side);close(p.z,gun.forward);close(target.z,VISOR_LIGHT.aimDistance);}
 assert.ok(high-low>.7,'luz acompanha a boca animada, sem ficar presa à altura física da cápsula');
});


test('Foco: altura da boca + offset nos giros e pisos; raio central até o chão não cruza o rifle',async()=>{
 const {Vector3,Raycaster,Group}=await import('three');
 const {attachRifle,RifleAimRig}=loadSource('src/characters/player/rifleAttachment.ts');
 const {RifleAnimationLayers}=loadSource('src/characters/player/rifleAnimationLayers.ts');
 const {pickTargetAction}=loadSource('src/characters/player/locomotionClips.ts');
 const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),r=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');attachRifle(g.scene,r.scene);
 const body=new Group();body.add(g.scene);const mixer=new AnimationMixer(g.scene),actions=Object.fromEntries(g.animations.map(c=>[c.name,mixer.clipAction(c)])),layers=new RifleAnimationLayers(actions);
 const rig=new RifleAimRig(g.scene,r.scene,.02),out={valid:false,side:0,forward:0,height:0},p=new Vector3(),target=new Vector3(),ray=new Raycaster(),direction=new Vector3();
 for(const state of ['idle','walking','backward']) for(const floor of [0,.12,.148,.25]) for(const angle of [0,Math.PI/2,-Math.PI,.8]){
  const player={x:3,y:floor,z:-2};body.position.set(player.x,floor+.02,player.z);body.rotation.y=angle;
  for(const action of Object.values(layers.legs)) action?.stop();const base=pickTargetAction(state,layers.legs,true);base.reset().play();
  for(let f=0;f<15;f++){
   layers.update(state,0,true,base,false);mixer.update(1/60);
   rig.update(out,player,angle,{x:player.x+Math.sin(angle)*12,z:player.z+Math.cos(angle)*12},true);
   writeVisorLight(p,target,player,angle,out);
   const muzzle=rig.muzzle.getWorldPosition(new Vector3());assert.ok(Math.hypot(p.x-muzzle.x,p.z-muzzle.z)<1e-6);close(p.y,muzzle.y+VISOR_LIGHT.muzzleLift);
   direction.subVectors(target,p);ray.far=direction.length();ray.set(p,direction.normalize());
   assert.equal(ray.intersectObject(r.scene,true).length,0,`${state}/${floor}/${angle}/${f}: arma bloqueia o centro do foco`);
  }
 }
 layers.dispose();
});
