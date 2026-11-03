import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationMixer, Box3, Vector3, Quaternion } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createRequire } from 'node:module';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { weaponCarryMode } = loadSource('src/characters/player/weaponCarry.ts');
const { attachHolsteredMachete, attachMachete, MacheteHolsterRig, MACHETE_HOLSTER_TRANSFORM } = loadSource('src/characters/player/macheteAttachment.ts');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('Arma principal: colônia exibe só a seleção no coldre; Shanghai empunha a escolha e preserva o rifle reserva',()=>{
 for(const selected of ['rifle','machete']){
  assert.equal(weaponCarryMode(selected,selected,false),'holster');
  assert.equal(weaponCarryMode(selected==='rifle'?'machete':'rifle',selected,false),'hidden');
  assert.equal(weaponCarryMode(selected,selected,true),'hand');
 }
 assert.equal(weaponCarryMode('rifle','machete',true),'holster');
 assert.equal(weaponCarryMode('machete','rifle',true),'hidden');
});

test('Arma principal: facão preso ao quadril nos clipes da colônia e Dash, sem alterar cache ou encaixe nas mãos',async()=>{
 const original=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),asset=await loadGlb('src/assets/weapons/facao-v001.glb');
 const character=clone(original.scene),weapon=asset.scene.clone(true),mixer=new AnimationMixer(character),hips=character.getObjectByName('mixamorigHips');
 assert.equal(attachHolsteredMachete(character,weapon),true);assert.equal(weapon.parent,hips);
 const rig=new MacheteHolsterRig(character,weapon);let anchor,minimum=Infinity;
 for(const name of ['Idle_Colony','Run_Colony','Backward_Colony','Dash']){
  mixer.stopAllAction();const clip=original.animations.find(c=>c.name===name);mixer.clipAction(clip).play();
  for(let f=0;f<120;f++){
   mixer.setTime(f*clip.duration/120);character.updateMatrixWorld(true);rig.update(name==='Dash',clip.duration/120);character.updateMatrixWorld(true);
   if(name==='Idle_Colony'&&f===0){const grip=weapon.getObjectByName('Grip_R').getWorldPosition(new Vector3());close(grip.x,-.26);close(grip.y,.76);close(grip.z,-.035);}
   assert.equal(weapon.parent,hips);if(name!=='Dash')minimum=Math.min(minimum,new Box3().setFromObject(weapon).min.y);
   // Cabo preso ao mesmo ponto do quadril; lâmina para trás, paralela à lateral,
   // sem abrir para o lado nem herdar os balanços/rolagens do osso.
   const grip=hips.worldToLocal(weapon.getObjectByName('Grip_R').getWorldPosition(new Vector3()));
   if(!anchor)anchor=grip;else assert.ok(grip.distanceTo(anchor)<1e-5);
   if(name==='Dash'){
    const local=new Quaternion().fromArray(MACHETE_HOLSTER_TRANSFORM.quaternion).normalize();
    assert.ok(weapon.quaternion.angleTo(local)<1e-5,'no Dash segue o osso sem estabilização mundial');
    weapon.position.toArray().forEach((v,i)=>close(v,MACHETE_HOLSTER_TRANSFORM.position[i]));
   }else{
    const direction=new Vector3(0,-1,0).transformDirection(weapon.matrixWorld);
    assert.ok(Math.abs(direction.x)<1e-5&&direction.z<-.93);
    assert.ok(direction.y<-.35&&direction.y>-.38,'inclinação aprovada de 21°');
    const normal=new Vector3(0,0,1).transformDirection(weapon.matrixWorld);assert.ok(normal.x>.999,'face plana junto ao corpo');
   }
  }
 }
 assert.ok(minimum>.01,`lâmina livre do piso em Idle/Run/Backward: ${minimum}`);
 mixer.stopAllAction();mixer.clipAction(original.animations.find(c=>c.name==='Idle_Colony')).reset().play();
 for(let f=0;f<60;f++){mixer.update(1/60);character.updateMatrixWorld(true);rig.update(false,1/60);character.updateMatrixWorld(true);}
 const returned=new Vector3(0,-1,0).transformDirection(weapon.matrixWorld);assert.ok(returned.y<-.35&&returned.y>-.38,'após Dash retorna à ponta mais baixa');
 const before=weapon.matrixWorld.clone();rig.update();character.updateMatrixWorld(true);assert.ok(weapon.matrixWorld.equals(before),'pose congelada não deriva');
 character.rotation.y=.8;character.updateMatrixWorld(true);rig.update();character.updateMatrixWorld(true);
 const direction=new Vector3(0,-1,0).transformDirection(weapon.matrixWorld).applyQuaternion(character.getWorldQuaternion(new Quaternion()).invert());
 assert.ok(Math.abs(direction.x)<1e-5&&direction.z<-.93,'coldre gira junto com o corpo');
 weapon.removeFromParent();assert.equal(attachMachete(character,weapon),true);assert.equal(weapon.parent,character.getObjectByName('mixamorigRightHand'));
 weapon.removeFromParent();assert.equal(asset.scene.parent,null);assert.equal(original.scene.getObjectByName('PlayerMacheteHolstered'),undefined);
 hips.name='mixamorig:Hips';assert.equal(attachHolsteredMachete(character,weapon),true);weapon.removeFromParent();
 assert.equal(attachHolsteredMachete(asset.scene,weapon),false);
});

test('Dash na colônia: cápsula real percorre pátio, respeita parede do Hangar/porta fechada da Meeting Room e consome energia',async()=>{
 const req=createRequire(import.meta.url),R=createRequire(req.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
 const {createWorld}=loadSource('src/game/marsWorld.ts');
 const {advanceDash,dashEnabled}=loadSource('src/characters/player/playerDash.ts');
 const {constrainToWalkableAreas}=loadSource('src/characters/player/playerMovement.ts');
 const {PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P,PLAYER_COLLIDER_CENTER_Y:Y,PLAYER_COLLIDER_HALF_HEIGHT:H}=loadSource('src/characters/player/playerConfig.ts');
 for(const {startX,startZ,direction,mode} of [{startX:0,startZ:5.5,direction:1,mode:'free'},{startX:2.5,startZ:8.8,direction:1,mode:'wall'},{startX:0,startZ:6,direction:-1,mode:'door'}]){
  const map=createWorld(),physics=new R.World({x:0,y:0,z:0});physics.timestep=1/60;
  try{
   for(const c of [...map.simpleCuboids,...map.movingCuboids])physics.createCollider(R.ColliderDesc.cuboid(...c.halfExtents).setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));
   for(const c of map.obstacles.filter(c=>c.physics!==false))physics.createCollider(R.ColliderDesc.cuboid((c.maxX-c.minX)/2,2,(c.maxZ-c.minZ)/2).setTranslation((c.minX+c.maxX)/2,2,(c.minZ+c.maxZ)/2));
   const body=physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(startX,Y,startZ)),capsule=physics.createCollider(R.ColliderDesc.capsule(H,M.colliderRadius),body),controller=physics.createCharacterController(P.controllerOffset),out={x:0,z:0},energy={value:2};
   const until={current:0},cooldown={current:0},held={current:false};physics.step();
   for(let f=0;f<60;f++){
    const now=f/60,active=advanceDash(now,true,!dashEnabled('mars'),until,cooldown,held,energy),position=body.translation();
    const dt=active?Math.min(1/60,until.current-now):0;
    constrainToWalkableAreas(position.x,position.z,0,direction*M.dashSpeed*dt,map.bounds,map.walkableAreas,M.colliderRadius,out);
    controller.computeColliderMovement(capsule,{x:out.x,y:0,z:out.z});const move=controller.computedMovement();body.setNextKinematicTranslation({x:position.x+move.x,y:Y,z:position.z+move.z});physics.step();
   }
   const end=body.translation();assert.equal(energy.value,1,'uma carga; segurar não repete');assert.ok(Math.abs(end.x-startX)<.002,'sem desvio lateral além da tolerância numérica do contato');
   if(mode==='free')close(end.z-startZ,M.dashSpeed*M.dashDuration);
   else if(mode==='wall'){assert.ok(end.z>startZ+.5);assert.ok(end.z<11.2,'não atravessa o casco norte');}
   else {assert.ok(end.z<startZ-.5);assert.ok(end.z>4.2,'não atravessa a porta sul fechada');}
  }finally{physics.free();}
 }
});

test('Arma principal: escolha do inventário permanece na ida, retry e retorno de Shanghai',()=>{
 const {useWeaponStore:weapons}=loadSource('src/state/useWeaponStore.ts'),{useExpeditionStore:expedition}=loadSource('src/state/useExpeditionStore.ts'),{useGameStore:game}=loadSource('src/state/useGameStore.ts'),{useCombatStore:combat}=loadSource('src/state/useCombatStore.ts');
 const {equipPlayerWeapon}=loadSource('src/characters/player/WeaponControls.tsx'),{MAPS}=loadSource('src/game/config.ts'),{placePlayer,playerPosition}=loadSource('src/state/playerTransient.ts');
 const before=[expedition.getState(),game.getState(),combat.getState(),weapons.getState()],position={...playerPosition};
 try{
  expedition.setState({ready:true,panel:null,session:{map:'mars',phase:'walking',destination:null,revision:0}});game.setState({isPaused:true});combat.setState({dead:false});
  assert.equal(equipPlayerWeapon('machete','inventory'),true);game.setState({isPaused:false});
  for(const origin of ['mars','shanghai']){
   placePlayer(MAPS[origin].exit);expedition.getState().send('board');assert.equal(expedition.getState().session.phase,'aboard');
   expedition.getState().send('depart');assert.equal(expedition.getState().session.phase,'travelling');
   expedition.getState().send('arrive');assert.equal(expedition.getState().session.map,origin==='mars'?'shanghai':'mars');
   expedition.getState().setReady(true);expedition.getState().send('exit');assert.equal(expedition.getState().session.phase,'walking');
   assert.equal(weapons.getState().weapon,'machete');
   if(origin==='mars'){const run=combat.getState().run;expedition.getState().restartMission();assert.ok(combat.getState().run>run);assert.equal(weapons.getState().weapon,'machete');}
  }
 }finally{expedition.setState(before[0],true);game.setState(before[1],true);combat.setState(before[2],true);weapons.setState(before[3],true);placePlayer(position);}
});


test('Facão no Dash: rotação mundial acompanha a mesma rotação do rifle em todo o clipe e congela na pausa',async()=>{
 const {attachHolsteredRifle}=loadSource('src/characters/player/rifleAttachment.ts');
 const original=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),sword=await loadGlb('src/assets/weapons/facao-v001.glb'),rifle=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
 const character=clone(original.scene),weapon=sword.scene.clone(true),gun=rifle.scene.clone(true),mixer=new AnimationMixer(character),clip=original.animations.find(c=>c.name==='Dash');
 attachHolsteredMachete(character,weapon);attachHolsteredRifle(character,gun);const rig=new MacheteHolsterRig(character,weapon);
 mixer.clipAction(clip).play();let firstSword,firstRifle,maximum=0;
 for(let f=0;f<120;f++){
  mixer.setTime(f*clip.duration/120);character.updateMatrixWorld(true);rig.update(true,clip.duration/120);character.updateMatrixWorld(true);
  const a=weapon.getWorldQuaternion(new Quaternion()).normalize(),b=gun.getWorldQuaternion(new Quaternion()).normalize();
  if(!firstSword){firstSword=a.clone().invert();firstRifle=b.clone().invert();}
  const da=a.multiply(firstSword),db=b.multiply(firstRifle);assert.ok(da.angleTo(db)<1e-5,`mesma rotação do corpo que o rifle: ${da.angleTo(db)}`);maximum=Math.max(maximum,da.angleTo(new Quaternion()));
  const before=weapon.matrixWorld.clone();rig.update(true,0);character.updateMatrixWorld(true);assert.ok(weapon.matrixWorld.equals(before));
 }
 assert.ok(maximum>1,'não fica estabilizado no espaço durante a acrobacia');
});
