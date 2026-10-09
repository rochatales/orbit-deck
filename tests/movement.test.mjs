import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSource} from './load-source.mjs';
// S2.12 · movimento pela mira (regra 4 do AGENTS.md): W corre na direção do cursor, S recua
// voltado ao cursor, A/D não deslocam, W + S neutralizam.
const M=loadSource('src/characters/player/aimMovement.ts');
const C=loadSource('src/characters/player/playerConfig.ts');
const L=loadSource('src/characters/player/locomotionClips.ts');
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
const ANGULOS=[0,Math.PI/2,Math.PI,-Math.PI/2,.73,2.4];

test('S2.12: W avança, S recua e W + S (ou nenhum) neutralizam',()=>{
  assert.equal(M.aimInput(true,false),1);
  assert.equal(M.aimInput(false,true),-1);
  assert.equal(M.aimInput(true,true),0);
  assert.equal(M.aimInput(false,false),0);
  const out={x:9,z:9};
  for(const a of ANGULOS){M.aimMotion(a,0,out);close(out.x,0);close(out.z,0);}
});

test('S2.12: A/D não deslocam — não há ação lateral e o deslocamento é sempre paralelo à mira',()=>{
  const src=fs.readFileSync('src/controls/keyboardControls.ts','utf8');
  for(const k of ['KeyA','KeyD','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'])assert.ok(!src.includes(`"${k}"`),`${k} ainda mapeada`);
  const ctrl=fs.readFileSync('src/characters/player/PlayerController.tsx','utf8');
  assert.doesNotMatch(ctrl,/Leftward|Rightward|GameControl\.Run/);
  const out={x:0,z:0};
  for(const a of ANGULOS)for(const i of [1,-1]){
    M.aimMotion(a,i,out);
    close(out.x*Math.cos(a)-out.z*Math.sin(a),0);      // componente lateral nula
    close(Math.hypot(out.x,out.z),1);
  }
});

test('S2.12: recuo vai na direção oposta à mira sem inverter a orientação do personagem',()=>{
  const out={x:0,z:0};
  for(const a of ANGULOS){
    // cursor 5 m à frente na direção a; o player está na origem
    const ang=M.updateAimAngle(0,0,0,5*Math.sin(a),5*Math.cos(a),true,C.PLAYER_LOCOMOTION.aimMinDistance);
    close(Math.atan2(Math.sin(ang-a),Math.cos(ang-a)),0);   // corpo voltado ao cursor
    M.aimMotion(ang,-1,out);
    close(out.x,-Math.sin(a));close(out.z,-Math.cos(a));     // desloca para trás
    // a orientação continua a da mira (não gira 180° para correr de frente)
    close(M.updateAimAngle(ang,out.x*0.1,out.z*0.1,5*Math.sin(a),5*Math.cos(a),true,C.PLAYER_LOCOMOTION.aimMinDistance),Math.atan2(5*Math.sin(a)-out.x*0.1,5*Math.cos(a)-out.z*0.1));
  }
});

test('S2.12: cursor perto do personagem mantém a última direção válida, sem tremor',()=>{
  const min=C.PLAYER_LOCOMOTION.aimMinDistance; assert.ok(min>=0.3);
  let ang=M.updateAimAngle(0,0,0,3,3,true,min); close(ang,Math.PI/4);
  for(let i=0;i<200;i++){   // cursor oscilando sobre o corpo (raio < min)
    const r=(min*0.9)*((i%7)/7), t=i*2.39;
    ang=M.updateAimAngle(ang,0,0,r*Math.sin(t),r*Math.cos(t),true,min);
    close(ang,Math.PI/4);
  }
  ang=M.updateAimAngle(ang,0,0,-4,0,false,min); close(ang,Math.PI/4);   // sem mira válida: mantém
  ang=M.updateAimAngle(ang,0,0,-4,0,true,min); close(ang,-Math.PI/2);   // longe de novo: atualiza
});

test('S2.12: velocidades de corrida e recuo separadas e recuo mais lento; Shift não é necessário',()=>{
  const V=C.PLAYER_MOVEMENT;
  assert.ok(V.runSpeed>0&&V.backSpeed>0&&V.backSpeed<V.runSpeed);
  assert.equal('runMultiplier' in V,false);
  assert.equal(C.PLAYER_BACKWARD_REFERENCE_SPEED,0.8);
});

test('S2.12: locomoção pela velocidade real, com histerese e parada contra parede',()=>{
  const {startSpeed:s,stopSpeed:p}=C.PLAYER_LOCOMOTION; assert.ok(p<s);
  assert.equal(M.locomotionKind('idle',1,s*0.9,s,p),'idle');      // ainda não começou
  assert.equal(M.locomotionKind('idle',1,s,s,p),'run');
  assert.equal(M.locomotionKind('run',1,p*1.1,s,p),'run');         // histerese ao desacelerar
  assert.equal(M.locomotionKind('run',1,p*0.9,s,p),'idle');
  assert.equal(M.locomotionKind('idle',-1,1.2,s,p),'backward');
  assert.equal(M.locomotionKind('run',-0.5,1.0,s,p),'backward');   // W → S direto
  assert.equal(M.locomotionKind('backward',1,1.0,s,p),'run');      // S → W direto
  assert.equal(M.locomotionKind('run',0,0,s,p),'idle');            // W contra parede: velocidade real 0
});

test('S2.12: taxa dos ciclos acompanha a velocidade real dentro dos limites',()=>{
  const ref=C.PLAYER_BACKWARD_REFERENCE_SPEED, lim=C.PLAYER_LOCOMOTION.backwardTimeScale;
  close(M.playbackRate(ref,ref,lim),1);
  close(M.playbackRate(C.PLAYER_MOVEMENT.backSpeed,ref,lim),C.PLAYER_MOVEMENT.backSpeed/ref);
  assert.ok(C.PLAYER_MOVEMENT.backSpeed/ref<=lim[1],'velocidade de recuo dentro do limite da taxa');
  close(M.playbackRate(0,ref,lim),lim[0]);
  close(M.playbackRate(99,ref,lim),lim[1]);
  const run=C.PLAYER_LOCOMOTION.runTimeScale;
  assert.ok(C.PLAYER_MOVEMENT.runSpeed/C.PLAYER_RUN_REFERENCE_SPEED<=run[1],'corrida dentro do limite da taxa (sem deslizar)');
});

test('S2.12: seleção e transição de clipes (Idle, Run, Backward; queda e interação têm prioridade)',()=>{
  const a={Idle:{n:'Idle'},Run:{n:'Run'},Talk:{n:'Talk'},Fall:{n:'Fall'},Backward:{n:'Backward'}};
  assert.equal(L.pickTargetAction('idle',a).n,'Idle');
  assert.equal(L.pickTargetAction('walking',a).n,'Run');
  assert.equal(L.pickTargetAction('backward',a).n,'Backward');
  assert.equal(L.pickTargetAction('falling',a).n,'Fall');
  assert.equal(L.pickTargetAction('interacting',a).n,'Talk');
  const antigo={Idle:a.Idle,Run:a.Run,Talk:a.Talk,Fall:a.Fall};   // GLB anterior, sem Backward
  assert.equal(L.pickTargetAction('backward',antigo).n,'Run');
  const T=C.PLAYER_LOCOMOTION;
  assert.equal(L.crossfadeFor('idle','walking'),T.crossfade);
  assert.equal(L.crossfadeFor('idle','backward'),T.crossfade);
  assert.equal(L.crossfadeFor('walking','backward'),T.crossfadeReverse);
  assert.equal(L.crossfadeFor('backward','walking'),T.crossfadeReverse);
  assert.equal(L.crossfadeFor('walking','falling'),T.crossfadeFall);
  for(const v of [T.crossfade,T.crossfadeReverse,T.crossfadeFall])assert.ok(v>0&&v<=0.25,'transições curtas');
});

test('S2.12: bloqueios de sessão param o movimento antes de ler as teclas',()=>{
  const ctrl=fs.readFileSync('src/characters/player/PlayerController.tsx','utf8');
  const bloqueio=ctrl.indexOf('if (simulationBlocked())'), teclas=ctrl.indexOf('getKeys()',ctrl.indexOf('useBeforePhysicsStep'));
  assert.ok(bloqueio>0&&teclas>bloqueio,'o passo verifica o bloqueio antes das teclas');
  globalThis.localStorage??={getItem:()=>null,setItem(){}};
  const {simulationBlocked}=loadSource('src/game/simulationGate.ts');
  const {useExpeditionStore:e}=loadSource('src/state/useExpeditionStore.ts');
  const {useGameStore:g}=loadSource('src/state/useGameStore.ts');
  const {useCombatStore:c}=loadSource('src/state/useCombatStore.ts');
  const livre={ready:true,panel:null,session:{map:'mars',phase:'walking',destination:null,revision:0}};
  e.setState(livre);g.setState({isPaused:false});c.setState({dead:false});
  assert.equal(simulationBlocked(),false);
  g.setState({isPaused:true});assert.equal(simulationBlocked(),true,'pausa');g.setState({isPaused:false});
  e.setState({panel:'eden'});assert.equal(simulationBlocked(),true,'diálogo');e.setState({panel:null});
  e.setState({ready:false});assert.equal(simulationBlocked(),true,'carregamento/transição');e.setState({ready:true});
  e.setState({session:{...livre.session,phase:'aboard'}});assert.equal(simulationBlocked(),true,'a bordo');
  e.setState({session:{...livre.session,map:'shanghai'}});c.setState({dead:true});assert.equal(simulationBlocked(),true,'morte');
});

test('S2.12: asset r7 separado, com os cinco clipes e o mesmo rig; GLB ativo preservado',()=>{
  const glb=fs.readFileSync('src/assets/characters/player/explorador-r7.glb');
  const j=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
  assert.deepEqual(j.animations.map(a=>a.name).sort(),['Backward','Fall','Idle','Run','Talk']);
  assert.equal(j.skins[0].joints.length,41);
  const ativo=fs.readFileSync('src/assets/characters/player/player-main.glb');
  const ja=JSON.parse(ativo.subarray(20,20+ativo.readUInt32LE(12)).toString());
  assert.deepEqual(j.skins[0].joints.map(i=>j.nodes[i].name),ja.skins[0].joints.map(i=>ja.nodes[i].name),'mesmos ossos, na mesma ordem');
  const cfg=fs.readFileSync('src/characters/characterAssetConfig.ts','utf8');
  assert.match(cfg,/EXPLORADOR_R7_ASSET[\s\S]*scale: 0\.857[\s\S]*materialProfile: 'preservar'/);
  assert.match(cfg,/PLAYER_CHARACTER_ASSET[\s\S]*player-main|playerAsset/);
  const escolha=fs.readFileSync('src/characters/player/playerAssetChoice.ts','utf8');
  assert.match(escolha,/'atual' \? 'atual' : 'r7'/,'a prévia começa com a r7');
});
