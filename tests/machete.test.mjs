import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, LoopOnce, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { MACHETE, meleeCanHit } = loadSource('src/combat/melee.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { patrolChoice, COMBAT, robotConfig } = loadSource('src/combat/config.ts');
const { MacheteAnimationLayers } = loadSource('src/characters/player/macheteAnimationLayers.ts');
const { attachMachete, MacheteGripRig, MACHETE_HAND_TRANSFORM } = loadSource('src/characters/player/macheteAttachment.ts');
const { meleeReticleTarget } = loadSource('src/characters/player/reticle.ts');
const bounds={minX:-60,maxX:60,minZ:-60,maxZ:60},world={bounds,walkableAreas:[bounds],obstacles:[]};
const input={player:{x:0,z:0},aim:{x:0,z:2},facingAngle:0,firing:false,reload:false,weapon:'machete'};
const frames=(s,n,i=input,paused=false)=>{for(let f=0;f<n;f++)s.step(1/60,i,paused);};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const player=await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const supplement=await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
const sword=await loadGlb('src/assets/weapons/facao-v001.glb');

function setup(kind='patrol') {
 const s=new CombatSimulation(world,patrolChoice(kind,1));
 const r=s.robots[0];Object.assign(r,{x:0,z:robotConfig(r).contactRange,pace:0,alerted:true});s.invulnerable=999;
 return s;
}
function swing(s,custom={}) {s.step(1/60,{...input,...custom,firing:true});frames(s,20,{...input,...custom});}

test('Facão: fontes preservadas por SHA, quatro clipes ativos e bloqueio apenas arquivado; rig compatível',()=>{
 const root='art-source/armas/facao/';const sources=JSON.parse(fs.readFileSync(root+'notas/fontes-v001.json'));
 assert.equal(sources.length,7);for(const f of sources)assert.equal(hash(root+f.copy),f.sha256);
 const notes=JSON.parse(fs.readFileSync(root+'notas/clipes-v001.json'));
 assert.equal(hash('src/assets/characters/player/explorador-astronauta.glb'),notes.base_glb_sha256,'astronauta aprovado intacto');
 assert.equal(hash('src/assets/characters/player/explorador-facao-v001.glb'),notes.glb.sha256);
 const weapon=JSON.parse(fs.readFileSync(root+'notas/arma-v001.json'));
 assert.equal(hash('src/assets/weapons/facao-v001.glb'),weapon.glb_sha256);
 assert.equal(hash('src/assets/ui/facao-icon-v001.png'),weapon.icon_sha256);
 assert.deepEqual(supplement.animations.map(c=>c.name).sort(),['Machete_Backward','Machete_Block','Machete_Idle','Machete_Run','Machete_Slash']);
 const a=[],b=[];player.scene.traverse(n=>{if(n.isBone)a.push(n.name);});supplement.scene.traverse(n=>{if(n.isBone)b.push(n.name);});assert.equal(a.length,57);assert.deepEqual(a.sort(),b.sort());
 assert.ok(fs.readFileSync('src/characters/player/PlayerMachete.tsx','utf8').includes("clip.name !== 'Machete_Block'"));
});

test('Facão: root sem deriva, duas mãos encaixadas nos quatro clipes e rig sem contaminar o cache',()=>{
 const character=clone(player.scene),weapon=sword.scene.clone(true),mixer=new AnimationMixer(character);assert.equal(attachMachete(character,weapon),true);
 const rig=new MacheteGripRig(character,weapon),palm=side=>character.getObjectByName('mixamorig'+side+'HandIndex1').getWorldPosition(new Vector3()).add(character.getObjectByName('mixamorig'+side+'HandThumb2').getWorldPosition(new Vector3())).multiplyScalar(.5);
 for(const clip of supplement.animations.filter(c=>c.name!=='Machete_Block')) {
  mixer.stopAllAction();const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();let anchor;
  for(let f=0;f<=36;f++) {
   mixer.setTime(clip.duration*f/36);rig.update();character.updateMatrixWorld(true);
   const hips=character.getObjectByName('mixamorigHips').getWorldPosition(new Vector3());if(!anchor)anchor=hips;
   assert.ok(Math.hypot(hips.x-anchor.x,hips.z-anchor.z)<1e-5,clip.name);
   assert.ok(weapon.getObjectByName('Grip_R').getWorldPosition(new Vector3()).distanceTo(palm('Right'))<1e-5,clip.name);
   assert.ok(weapon.getObjectByName('Grip_L').getWorldPosition(new Vector3()).distanceTo(palm('Left'))<.07,clip.name);
  }
 }
 rig.update(false);assert.deepEqual(weapon.position.toArray(),Array.from(MACHETE_HAND_TRANSFORM.position));
 assert.equal(sword.scene.parent,null);weapon.removeFromParent();
});

test('Facão: 50 de dano por golpe no quadro de impacto; não consome munição nem energia e não repete durante recuperação',()=>{
 const s=setup('largePatrol'),r=s.robots[0],hp=r.hp;
 s.step(1/60,{...input,firing:true,reload:true});assert.equal(r.hp,hp);assert.equal(s.swingId,1);assert.equal(s.reloadLeft,0);
 frames(s,18,input);assert.equal(r.hp,hp);
 frames(s,3,input);assert.equal(r.hp,hp-50);
 frames(s,15,{...input,firing:true});assert.equal(r.hp,hp-50);assert.equal(s.swingId,1);
 assert.equal(s.ammo,COMBAT.rifle.magazine);assert.equal(s.reserve,COMBAT.rifle.reserve);assert.equal(s.shots.length,0);
 assert.ok(!s.sounds.slots.slice(0,s.sounds.count).some(e=>['shot','dryFire','reload'].includes(e.type)));
});

test('Facão: arco frontal 120°, alcance até a superfície e parede/quina impedem golpe e captura',()=>{
 const player={x:0,z:0};
 assert.equal(meleeCanHit(player,0,{x:Math.sin(Math.PI/3)*2.6,z:Math.cos(Math.PI/3)*2.6},.5,world),true);
 assert.equal(meleeCanHit(player,0,{x:Math.sin(Math.PI/3+.01)*2.6,z:Math.cos(Math.PI/3+.01)*2.6},.5,world),false);
 assert.equal(meleeCanHit(player,0,{x:0,z:3.09},.5,world),true);
 assert.equal(meleeCanHit(player,0,{x:0,z:3.11},.5,world),false);
 for(const obstacle of [{minX:-1,maxX:1,minZ:.4,maxZ:.5},{minX:-.1,maxX:.1,minZ:.4,maxZ:.5}]) {
  const terrain={...world,obstacles:[obstacle]},s=new CombatSimulation(terrain,1),r=s.robots[0];Object.assign(r,{x:0,z:1.5,pace:0,alerted:true});s.invulnerable=999;
  const hp=r.hp;swing(s);assert.equal(r.hp,hp);assert.equal(meleeReticleTarget(player,r,0,terrain,s.robots),null);
 }
});

test('Facão: atinge todos os alvos do arco uma vez; mortes e drops dos quatro tipos são únicos',()=>{
 for(const kind of ['patrol','largePatrol','smallMutant','largeMutant']) {
  const s=setup(kind),r=s.robots[0];r.hp=50;swing(s);assert.equal(r.hp,0,kind);assert.equal(s.kills,1);
  const drops=s.drops.filter(d=>d.spawned);assert.equal(drops.length,kind==='largeMutant'?3:1);
  assert.equal(drops[0].kind,kind==='largePatrol'?'titanium':kind.includes('Mutant')?'organic':'metals');
  frames(s,60,{...input,firing:true});assert.equal(s.kills,1);
 }
 const s=new CombatSimulation(world,3);s.invulnerable=999;
 for(let i=0;i<3;i++)Object.assign(s.robots[i],{x:(i-1)*.6,z:1.5,hp:75,pace:0,alerted:true});
 swing(s);assert.ok(s.robots.every(r=>r.hp===25));
});

test('Facão: pausa congela o golpe, Dash/troca cancelam a janela; arma anterior não dispara por engano',()=>{
 const s=setup(),r=s.robots[0];s.step(1/60,{...input,firing:true});const left=s.meleeLeft;frames(s,100,input,true);assert.equal(s.meleeLeft,left);
 s.step(1/60,{...input,dashing:true});assert.equal(s.meleeLeft,0);frames(s,40,input);assert.equal(r.hp,robotConfig(r).hp);
 swing(s);assert.equal(r.hp,25);s.step(1/60,{...input,weapon:'rifle'});assert.equal(s.meleeLeft,0);
 const fresh=setup();assert.equal(fresh.swingId,0);assert.equal(fresh.meleeLeft,0);
});

test('Facão: camada do corte preserva pernas, sincroniza com a simulação e pausa/conclusão não vazam para rifle',async()=>{
 const combo=await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
 const { comboClipTime }=loadSource('src/characters/player/swordClips.ts');
 const character=clone(player.scene),mixer=new AnimationMixer(character);
 const all=[...player.animations,...supplement.animations,...combo.animations],actions=Object.fromEntries(all.map(c=>[c.name,mixer.clipAction(c)]));
 const layers=new MacheteAnimationLayers(actions),base=layers.legs.Run;base.play();
 layers.update('walking',MACHETE.interval,0,base,false);mixer.update(.01);const upper=layers.upperAction;
 assert.ok(upper.getClip().tracks.every(t=>!/Hips|Foot|Leg|Toe/.test(t.name)));
 assert.ok(layers.legs.Run.getClip().tracks.some(t=>/Foot/.test(t.name)));
 layers.update('walking',MACHETE.interval/2,0,base,false);assert.ok(Math.abs(upper.time-comboClipTime(0,MACHETE.interval/2))<1e-8);
 const time=upper.time;layers.update('walking',0,0,base,true);assert.equal(upper.time,time);
 layers.update('dashing',.1,0,base,false);assert.equal(layers.upperAction,null);
 layers.update('backward',0,0,layers.legs.Backward,false);assert.match(layers.upperAction.getClip().name,/Backward/);
 layers.dispose();assert.equal(mixer.existingAction(upper.getClip(),character),null);
});

test('Facão: seleção 1/2 nos dois mapas; inventário permite trocar pausado, sem liberar diálogo/morte/viagem',()=>{
 const { equipPlayerWeapon }=loadSource('src/characters/player/WeaponControls.tsx');
 const { useWeaponStore:weapons }=loadSource('src/state/useWeaponStore.ts');
 const { useExpeditionStore:expedition }=loadSource('src/state/useExpeditionStore.ts');
 const { useGameStore:game }=loadSource('src/state/useGameStore.ts');
 const { useCombatStore:combat }=loadSource('src/state/useCombatStore.ts');
 const before=[expedition.getState(),game.getState(),combat.getState(),weapons.getState()];
 try {
  expedition.setState({ready:true,panel:null,session:{map:'shanghai',phase:'walking',destination:null,revision:1}});game.setState({isPaused:false});combat.setState({dead:false});
  equipPlayerWeapon('machete');assert.equal(weapons.getState().weapon,'machete');
  game.setState({isPaused:true});equipPlayerWeapon('rifle');assert.equal(weapons.getState().weapon,'machete');
  game.setState({isPaused:false});expedition.setState({panel:'eden'});equipPlayerWeapon('rifle');assert.equal(weapons.getState().weapon,'machete');
  expedition.setState({panel:null});combat.setState({dead:true});equipPlayerWeapon('rifle');assert.equal(weapons.getState().weapon,'machete');
  combat.setState({dead:false});equipPlayerWeapon('rifle');assert.equal(weapons.getState().weapon,'rifle');
  expedition.setState({session:{...expedition.getState().session,map:'mars'}});equipPlayerWeapon('machete');assert.equal(weapons.getState().weapon,'machete');
  game.setState({isPaused:true});assert.equal(equipPlayerWeapon('rifle','inventory'),true);assert.equal(weapons.getState().weapon,'rifle');assert.equal(game.getState().isPaused,true);
  for(const map of ['mars','shanghai']){
   expedition.setState({ready:true,panel:null,session:{map,phase:'walking',destination:null,revision:2}});combat.setState({dead:false});
   assert.equal(equipPlayerWeapon('machete','inventory'),true);assert.equal(weapons.getState().weapon,'machete');
   assert.equal(equipPlayerWeapon('rifle'),false,'atalho continua bloqueado pela pausa');
   expedition.setState({ready:false});assert.equal(equipPlayerWeapon('rifle','inventory'),false);
   expedition.setState({ready:true,panel:'eden'});assert.equal(equipPlayerWeapon('rifle','inventory'),false);
   expedition.setState({panel:null,session:{...expedition.getState().session,phase:'aboard'}});assert.equal(equipPlayerWeapon('rifle','inventory'),false);
   expedition.setState({session:{...expedition.getState().session,phase:'travelling'}});assert.equal(equipPlayerWeapon('rifle','inventory'),false);
   assert.equal(weapons.getState().weapon,'machete');
  }
  expedition.setState({session:{...expedition.getState().session,map:'shanghai',phase:'walking'}});combat.setState({dead:true});assert.equal(equipPlayerWeapon('rifle','inventory'),false);
  expedition.setState({session:{...expedition.getState().session,map:'mars'}});assert.equal(equipPlayerWeapon('rifle','inventory'),true,'morte antiga em Shanghai não bloqueia Marte');
 } finally {expedition.setState(before[0],true);game.setState(before[1],true);combat.setState(before[2],true);weapons.setState(before[3],true);}
});
