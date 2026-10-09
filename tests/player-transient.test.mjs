import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadSource} from './load-source.mjs';
const values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
const transient=loadSource('src/state/playerTransient.ts');
const {useGameStore:game}=loadSource('src/state/useGameStore.ts');
const {useExpeditionStore:store}=loadSource('src/state/useExpeditionStore.ts');
const {MAPS,EDEN}=loadSource('src/game/config.ts');
const {playerPosition,publishPlayerFrame,placePlayer}=transient;
function countNotifications(run){let count=0;const off=game.subscribe(()=>{count++;});try{run();}finally{off();}return count;}

test('S2.10: andar escreve na posição mutável sem notificar a store',()=>{
 placePlayer({x:0,y:0,z:0.8});game.getState().setProximity(false,false);
 const same=playerPosition;
 const notifications=countNotifications(()=>{for(let i=0;i<600;i++)publishPlayerFrame(Math.sin(i/30)*4,0.02,2+i*0.005,'mars');});
 assert.equal(notifications,0,'600 frames longe de EDEN e da nave não notificam ninguém');
 assert.equal(transient.playerPosition,same,'o objeto exportado nunca é substituído');
 assert.equal(playerPosition.y,0.02);
 assert.equal('playerPosition' in game.getState(),false,'a store não guarda mais a posição por frame');
});

test('S2.10: proximidade publica só quando a condição de interação muda',()=>{
 placePlayer({x:0,y:0,z:0});game.getState().setProximity(false,false);
 const seen=[];const off=game.subscribe(s=>seen.push([s.nearEden,s.nearShip]));
 // Caminha de z=0 até EDEN (z=-10) e volta: entra no raio uma vez e sai uma vez.
 for(let z=0;z>=-10;z-=0.05)publishPlayerFrame(0,0,z,'mars');
 for(let z=-10;z<=0;z+=0.05)publishPlayerFrame(0,0,z,'mars');
 // Até a área de embarque de Marte (exit z=29.5) e de volta.
 for(let z=0;z<=29.5;z+=0.05)publishPlayerFrame(0,0,z,'mars');
 for(let z=29.5;z>=20;z-=0.05)publishPlayerFrame(0,0,z,'mars');
 off();
 assert.deepEqual(seen,[[true,false],[false,false],[false,true],[false,false]]);
 // Em Shanghai não há EDEN, mesmo no mesmo ponto do mapa.
 publishPlayerFrame(EDEN.position.x,0,EDEN.position.z,'shanghai');
 assert.equal(game.getState().nearEden,false);
});

test('S2.10: guardas de EDEN e de embarque leem a posição mutável',()=>{
 store.setState({ready:true,panel:null,session:{map:'mars',phase:'walking',destination:null,revision:0}});game.setState({isPaused:false});
 placePlayer({x:0,y:0,z:0});store.getState().openEden();assert.equal(store.getState().panel,null,'longe de EDEN');
 placePlayer(EDEN.position);assert.equal(transient.isNearEden('mars'),true);
 store.getState().openEden();assert.equal(store.getState().panel,'eden');store.getState().closePanel();
 placePlayer({x:0,y:0,z:20});store.getState().send('board');assert.equal(store.getState().session.phase,'walking','longe da nave');
 placePlayer(MAPS.mars.exit);store.getState().send('board');assert.equal(store.getState().session.phase,'aboard');
});

test('S2.10: viagem, desembarque e retry reposicionam a fonte mutável e a proximidade no mesmo passo',()=>{
 store.setState({ready:true,panel:null,session:{map:'mars',phase:'walking',destination:null,revision:0}});game.setState({isPaused:false,nearEden:true,nearShip:false});
 placePlayer(MAPS.mars.exit);store.getState().send('board');
 assert.deepEqual({...playerPosition},MAPS.mars.ship);
 store.getState().send('depart');store.getState().send('arrive');store.getState().setReady(true);
 assert.equal(store.getState().session.map,'shanghai');
 assert.deepEqual({...playerPosition},MAPS.shanghai.ship,'chegada coloca o player na nave do destino');
 assert.equal(game.getState().nearEden,false,'proximidade do mapa anterior não sobrevive à viagem');
 store.getState().send('exit');
 assert.deepEqual({...playerPosition},MAPS.shanghai.exit);assert.equal(game.getState().nearShip,true);
 // Retry: posição e proximidade voltam ao spawn de Shanghai mesmo após andar.
 publishPlayerFrame(6,0,-4,'shanghai');assert.equal(game.getState().nearShip,false);
 store.getState().restartMission();
 assert.deepEqual({...playerPosition},MAPS.shanghai.exit);assert.equal(game.getState().nearShip,true);assert.equal(game.getState().isPaused,false);
});

test('S2.10: consumidores ativos não leem a posição da store nem a assinam por seletor',()=>{
 const files=[];(function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(e.name))files.push(f);}})('src');
 const offenders=files.filter(f=>/(getState\(\)|\bstate|\bg|\bs)\.playerPosition|setPlayerPosition/.test(fs.readFileSync(f,'utf8')));
 assert.deepEqual(offenders,[]);
 const map=fs.readFileSync('src/world/OfficeMap.tsx','utf8');
 assert.doesNotMatch(map,/useGameStore/,'o mapa não re-renderiza pela posição');
 const controller=fs.readFileSync('src/characters/player/PlayerController.tsx','utf8');
 assert.match(controller,/publishPlayerFrame\(translation\.x, motionRef\.current\.visualBob, translation\.z,/);
});
